/**
 * GeminiShareClient — connects the Orange UI to an Agent Foundry "share"
 * agent (Nexiva / Gemini Live native audio).
 *
 * Replaces the old FreeSWITCH/Verto path. The protocol is reverse-engineered
 * from the share bundle at demo-agentfoundry.bngrenew.com/converse/static/
 * (share.js + gemini-client.js + media-handler.js):
 *
 *   1. (optional) GET <base>/share/<key>/config        → { agent_name, ... }
 *   2. WS connect  wss://host<base>/ws/share/<key>
 *   3. on open → send {type:"config"}
 *   4. mic → AudioWorklet → downsample to 16 kHz → Int16 PCM → ws.send(bytes)
 *   5. ws binary frame  = 24 kHz Int16 PCM from the agent → play
 *      ws text frame    = JSON transcript:
 *         {type:"user",text} | {type:"gemini",text}
 *         {type:"turn_complete"} | {type:"interrupted"} | {type:"error",error}
 *   6. ws.close() to hang up
 *
 * The public surface (CallStatus / TranscriptEntry / VoiceCallbacks +
 * startCall/endCall/destroy) is kept identical to the old VertoClient so
 * NativeCall.tsx is a drop-in swap.
 */

// ── Types (kept compatible with the previous verto.ts exports) ──────────

export type CallStatus =
  | "idle"
  | "requesting-mic"
  | "connecting"
  | "ringing"
  | "connected"
  | "ended"
  | "error";

export interface TranscriptEntry {
  id: string;
  speaker: "user" | "agent";
  text: string;
  time: string;
  isFinal: boolean;
}

export interface ShareCallConfig {
  /** Agent Foundry base, e.g. "https://demo-agentfoundry.bngrenew.com/converse". */
  base: string;
  /** Share key — the last path segment of a /converse/share/<key> link. */
  shareKey: string;
}

export interface VoiceCallbacks {
  onStatusChange: (status: CallStatus, message?: string) => void;
  onSpeakingChange?: (aiSpeaking: boolean) => void;
  onTranscript?: (entry: TranscriptEntry) => void;
}

// ── Client ──────────────────────────────────────────────────────────────

export class GeminiShareClient {
  private cb: VoiceCallbacks;
  private destroyed = false;

  private ws: WebSocket | null = null;

  // Audio capture
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private muteGain: GainNode | null = null;
  private isRecording = false;

  // Audio playback scheduling
  private nextStartTime = 0;
  private scheduledSources: AudioBufferSourceNode[] = [];

  // Transcript turn tracking
  private turn = 0;
  private userTurnId = "";
  private agentTurnId = "";
  private userText = "";
  private agentText = "";

  constructor(callbacks: VoiceCallbacks) {
    this.cb = callbacks;
  }

  // ── Public API ────────────────────────────────────────────────────────

  async startCall(config: ShareCallConfig): Promise<void> {
    this.destroyed = false;

    // 1. microphone + audio graph
    this.cb.onStatusChange("requesting-mic");
    try {
      await this.initAudio();
    } catch {
      this.cb.onStatusChange("error", "Microphone access denied");
      this.cleanup();
      return;
    }
    if (this.destroyed) return this.cleanup();

    // 2. WebSocket
    this.cb.onStatusChange("connecting");
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const u = new URL(config.base);
    const prefix = u.pathname.replace(/\/$/, "");
    const wsUrl = `${proto}//${u.host}${prefix}/ws/share/${encodeURIComponent(
      config.shareKey
    )}`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.cb.onStatusChange("error", "Could not connect to server");
      this.cleanup();
      return;
    }
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      if (this.destroyed) return;
      // First frame must be the session config (empty is fine for share links).
      this.ws?.send(JSON.stringify({ type: "config" }));
      this.cb.onStatusChange("connected");
      this.startMic();
    };
    this.ws.onmessage = (ev) => this.handleMessage(ev.data);
    this.ws.onerror = () => {
      if (this.destroyed) return;
      this.cb.onStatusChange("error", "Connection error");
      this.cleanup();
    };
    this.ws.onclose = (ev) => {
      if (this.destroyed) return;
      // 1008/1013 carry a human-readable reason (e.g. agent unavailable).
      if ((ev.code === 1008 || ev.code === 1013) && ev.reason) {
        this.cb.onStatusChange("error", ev.reason);
      } else {
        this.cb.onStatusChange("ended");
      }
      this.cleanup();
    };
  }

  endCall(): void {
    // Detach handlers before close so a late onclose can't race a new call.
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      try {
        ws.close();
      } catch {
        /* noop */
      }
    }
    this.cb.onStatusChange("ended");
    this.cleanup();
  }

  destroy(): void {
    this.destroyed = true;
    this.cleanup();
  }

  // ── Audio: capture ──────────────────────────────────────────────────────

  private async initAudio(): Promise<void> {
    this.audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    // Worklet is served from the app root (landing/public/pcm-processor.js).
    await this.audioContext.audioWorklet.addModule("/pcm-processor.js");
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
  }

  private startMic(): void {
    if (!this.audioContext || !this.mediaStream || this.destroyed) return;

    this.mediaStreamSource = this.audioContext.createMediaStreamSource(
      this.mediaStream
    );
    this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");

    const ctxRate = this.audioContext.sampleRate;
    this.workletNode.port.onmessage = (event: MessageEvent) => {
      if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN)
        return;
      const down = downsample(event.data as Float32Array, ctxRate, 16000);
      this.ws.send(floatToPCM16(down));
    };

    this.mediaStreamSource.connect(this.workletNode);
    // Terminate the graph at the destination (muted) so the worklet keeps
    // producing samples — Web Audio stops idle branches otherwise.
    this.muteGain = this.audioContext.createGain();
    this.muteGain.gain.value = 0;
    this.workletNode.connect(this.muteGain);
    this.muteGain.connect(this.audioContext.destination);

    this.isRecording = true;
  }

  setMuted(muted: boolean): void {
    // Stop forwarding mic frames; playback + socket stay live.
    this.isRecording = !muted;
  }

  // ── Audio: playback ──────────────────────────────────────────────────────

  private playAudio(buf: ArrayBuffer): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === "suspended") void this.audioContext.resume();

    const pcm = new Int16Array(buf);
    const f32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;

    const audioBuffer = this.audioContext.createBuffer(1, f32.length, 24000);
    audioBuffer.getChannelData(0).set(f32);

    const src = this.audioContext.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    this.nextStartTime = Math.max(now, this.nextStartTime);
    src.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;

    this.scheduledSources.push(src);
    src.onended = () => {
      const i = this.scheduledSources.indexOf(src);
      if (i > -1) this.scheduledSources.splice(i, 1);
    };
  }

  private stopPlayback(): void {
    this.scheduledSources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* noop */
      }
    });
    this.scheduledSources = [];
    if (this.audioContext) this.nextStartTime = this.audioContext.currentTime;
  }

  // ── Incoming messages ─────────────────────────────────────────────────────

  private handleMessage(data: string | ArrayBuffer): void {
    if (typeof data === "string") {
      try {
        this.handleJson(JSON.parse(data));
      } catch {
        /* ignore malformed frames */
      }
      return;
    }
    // Binary = agent speech.
    this.cb.onSpeakingChange?.(true);
    this.playAudio(data);
  }

  private handleJson(msg: {
    type?: string;
    text?: string;
    error?: string;
  }): void {
    switch (msg.type) {
      case "user": {
        if (!this.userTurnId) this.userTurnId = `user-${++this.turn}`;
        this.userText += msg.text ?? "";
        this.emit("user", this.userTurnId, this.userText, false);
        break;
      }
      case "gemini": {
        if (!this.agentTurnId) this.agentTurnId = `agent-${++this.turn}`;
        this.agentText += msg.text ?? "";
        this.emit("agent", this.agentTurnId, this.agentText, false);
        break;
      }
      case "turn_complete": {
        this.finalizeTurn();
        this.cb.onSpeakingChange?.(false);
        break;
      }
      case "interrupted": {
        // Agent was cut off — drop queued speech, close out the turn.
        this.stopPlayback();
        this.finalizeTurn();
        this.cb.onSpeakingChange?.(false);
        break;
      }
      case "error": {
        this.cb.onStatusChange("error", msg.error || "Agent error");
        break;
      }
      default:
        break;
    }
  }

  private finalizeTurn(): void {
    if (this.userTurnId && this.userText)
      this.emit("user", this.userTurnId, this.userText, true);
    if (this.agentTurnId && this.agentText)
      this.emit("agent", this.agentTurnId, this.agentText, true);
    this.userTurnId = "";
    this.agentTurnId = "";
    this.userText = "";
    this.agentText = "";
  }

  private emit(
    speaker: "user" | "agent",
    id: string,
    text: string,
    isFinal: boolean
  ): void {
    this.cb.onTranscript?.({
      id,
      speaker,
      text,
      isFinal,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  private cleanup(): void {
    this.isRecording = false;
    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null;
      } catch {
        /* noop */
      }
    }
    this.mediaStreamSource?.disconnect();
    this.mediaStreamSource = null;
    this.workletNode?.disconnect();
    this.workletNode = null;
    this.muteGain?.disconnect();
    this.muteGain = null;
    this.stopPlayback();
    this.mediaStream?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* noop */
      }
    });
    this.mediaStream = null;
    if (this.audioContext) {
      void this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) {
      try {
        this.ws.close();
      } catch {
        /* noop */
      }
    }
    this.ws = null;
  }
}

// ── PCM helpers (from media-handler.js) ────────────────────────────────────

function downsample(
  buffer: Float32Array,
  sampleRate: number,
  outRate: number
): Float32Array {
  if (outRate === sampleRate) return buffer;
  const ratio = sampleRate / outRate;
  const newLen = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLen);
  let offResult = 0;
  let offBuffer = 0;
  while (offResult < result.length) {
    const next = Math.round((offResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offBuffer; i < next && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offResult] = count > 0 ? accum / count : 0;
    offResult++;
    offBuffer = next;
  }
  return result;
}

function floatToPCM16(buffer: Float32Array): ArrayBuffer {
  let l = buffer.length;
  const out = new Int16Array(l);
  while (l--) out[l] = Math.min(1, Math.max(-1, buffer[l])) * 0x7fff;
  return out.buffer;
}
