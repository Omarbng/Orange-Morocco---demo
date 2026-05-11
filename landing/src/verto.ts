/**
 * Verto WebRTC client — implements the FreeSWITCH Verto signaling
 * protocol (JSON-RPC 2.0 over WebSocket) + standard WebRTC for audio.
 *
 * Reverse-engineered from the tryeva call UI JS bundle. The protocol:
 *   1. WebSocket connect → wss://eva-demo-backend.bngrenew.com:443/webrtc2
 *   2. verto.login → authenticate with credentials + call params
 *   3. Server → verto.clientReady
 *   4. Client creates RTCPeerConnection + getUserMedia(audio)
 *   5. Creates SDP offer → sends verto.invite
 *   6. Server → SDP answer → setRemoteDescription
 *   7. Audio flows via WebRTC
 *   8. verto.bye → hangup
 *
 */

// ── Types ────────────────────────────────────────────────────────

export type CallStatus =
  | "idle"
  | "requesting-mic"
  | "connecting"
  | "ringing"
  | "connected"
  | "ended"
  | "error";

export interface CallConfig {
  wsUrl: string;
  login: string;
  passwd: string;
  loginParams: Record<string, unknown>;
  userVariables: Record<string, unknown>;
}

export interface TranscriptEntry {
  id: string;
  speaker: "user" | "agent";
  text: string;
  time: string;
  isFinal: boolean;
}

export interface VertoCallbacks {
  onStatusChange: (status: CallStatus, message?: string) => void;
  onSpeakingChange?: (aiSpeaking: boolean) => void;
  onTranscript?: (entry: TranscriptEntry) => void;
}

// ── Helpers ──────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

let rpcId = 0;
function nextId(): number {
  return ++rpcId;
}

// ── Client ───────────────────────────────────────────────────────

export class VertoClient {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private sessId = "";
  private callId = "";
  private config: CallConfig | null = null;
  private cb: VertoCallbacks;
  private destroyed = false;
  /** Accumulates streaming AI response chunks until finalized. */
  private aiChunk = "";
  /** Tracks current AI message ID for streaming updates. */
  private aiMsgId = "";

  constructor(callbacks: VertoCallbacks) {
    this.cb = callbacks;
  }

  // ── Public API ──────────────────────────────────────────────

  async startCall(config: CallConfig): Promise<void> {
    this.config = config;
    this.sessId = uuid();
    this.callId = uuid();
    this.destroyed = false;

    // Step 1 — microphone
    this.cb.onStatusChange("requesting-mic");
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    } catch {
      this.cb.onStatusChange("error", "Microphone access denied");
      return;
    }
    if (this.destroyed) return this.cleanup();

    // Step 2 — WebSocket
    this.cb.onStatusChange("connecting");
    try {
      await this.connectWebSocket(config.wsUrl);
    } catch {
      this.cb.onStatusChange("error", "Could not connect to server");
      this.cleanup();
      return;
    }
    if (this.destroyed) return this.cleanup();

    // Step 3 — login
    this.sendLogin();
    // Rest continues via onMessage handlers
  }

  endCall(): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.sessId && this.callId) {
      const bye = {
        jsonrpc: "2.0",
        method: "verto.bye",
        id: nextId(),
        params: {
          dialogParams: { callId: this.callId },
          cause: "NORMAL_CLEARING",
          sessid: this.sessId,
        },
      };
      this.ws.send(JSON.stringify(bye));
    }
    this.cb.onStatusChange("ended");
    this.cleanup();
  }

  destroy(): void {
    this.destroyed = true;
    this.cleanup();
  }

  // ── WebSocket ───────────────────────────────────────────────

  private connectWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
      } catch (e) {
        reject(e);
        return;
      }
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error("WebSocket error"));
      this.ws.onclose = () => {
        if (!this.destroyed) {
          this.cb.onStatusChange("ended", "Connection closed");
          this.cleanup();
        }
      };
      this.ws.onmessage = (ev) => this.handleMessage(ev.data);
    });
  }

  private sendLogin(): void {
    if (!this.config || !this.ws) return;
    const msg = {
      jsonrpc: "2.0",
      method: "verto.login",
      id: nextId(),
      params: {
        login: this.config.login,
        passwd: this.config.passwd,
        loginParams: { ...this.config.loginParams },
        userVariables: { ...this.config.userVariables },
        sessid: this.sessId,
      },
    };
    this.ws.send(JSON.stringify(msg));
    this.cb.onStatusChange("ringing");
  }

  // ── Message handler ─────────────────────────────────────────

  private handleMessage(raw: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const method = msg.method as string | undefined;

    // Server-initiated messages (have a "method" field)
    if (method) {
      switch (method) {
        case "verto.clientReady":
          this.onClientReady();
          break;
        case "verto.media":
        case "verto.answer": {
          const params = msg.params as Record<string, unknown> | undefined;
          const sdp = params?.sdp as string | undefined;
          if (sdp) this.setRemoteSdp(sdp);
          break;
        }
        case "verto.bye":
          this.cb.onStatusChange("ended");
          this.cleanup();
          break;
        case "verto.event": {
          const params = msg.params as Record<string, unknown> | undefined;
          const evName = params?.eventName as string | undefined;
          if (evName === "play_start")
            this.cb.onSpeakingChange?.(true);
          if (evName === "play_end")
            this.cb.onSpeakingChange?.(false);
          break;
        }
        case "verto.display":
          this.handleDisplay(msg);
          break;
        default:
          break;
      }
      // Also handle pong-like ping from server
      if (method === "verto.ping" && msg.id) {
        this.ws?.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: { method: "verto.ping" },
          })
        );
      }
      return;
    }

    // Response to our requests (have "id" but no "method")
    const result = msg.result as Record<string, unknown> | undefined;
    if (result) {
      // Check for SDP answer in invite response
      const sdp = result.sdp as string | undefined;
      if (sdp) this.setRemoteSdp(sdp);
    }
  }

  // ── WebRTC ──────────────────────────────────────────────────

  private async onClientReady(): Promise<void> {
    if (this.destroyed || !this.localStream || !this.config) return;

    // Init peer connection
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    // Remote audio playback
    this.pc.ontrack = (ev) => {
      this.remoteAudio = document.createElement("audio");
      this.remoteAudio.srcObject = ev.streams[0] ?? new MediaStream([ev.track]);
      this.remoteAudio.autoplay = true;
      document.body.appendChild(this.remoteAudio);
    };

    // Add local audio tracks
    this.localStream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, this.localStream!);
    });

    // Create SDP offer
    const offer = await this.pc.createOffer({ offerToReceiveAudio: true });
    await this.pc.setLocalDescription(offer);

    // Wait for ICE candidates to gather (5s, matching tryeva's approach)
    await new Promise((r) => setTimeout(r, 5000));

    if (this.destroyed) return this.cleanup();
    this.sendInvite();
  }

  private sendInvite(): void {
    if (!this.pc?.localDescription || !this.config || !this.ws) return;

    const msg = {
      jsonrpc: "2.0",
      method: "verto.invite",
      id: nextId(),
      params: {
        sdp: this.pc.localDescription.sdp,
        dialogParams: {
          callId: this.callId,
          caller_id_name: "EVA User",
          caller_id_number: "9876543210",
          destination_number: "2318",
          sessid: this.sessId,
          useMic: "any",
          useSpeak: "any",
          useStereo: false,
          useStream: false,
          useVideo: false,
          userVariables: { ...this.config.userVariables },
        },
        ...this.config.loginParams,
        manual_asr_control: true,
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  private async setRemoteSdp(sdp: string): Promise<void> {
    if (!this.pc || this.destroyed) return;
    try {
      await this.pc.setRemoteDescription({ type: "answer", sdp });
      this.cb.onStatusChange("connected");

      // Trigger start_asr after a short delay (matching tryeva's approach)
      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          const event = {
            jsonrpc: "2.0",
            method: "verto.event",
            id: nextId(),
            params: {
              sessid: this.sessId,
              eventName: "start_asr",
              callId: this.callId,
              eventBody: {},
            },
          };
          this.ws.send(JSON.stringify(event));
        }
      }, 1000);
    } catch (e) {
      console.error("Failed to set remote SDP:", e);
      this.cb.onStatusChange("error", "Call setup failed");
      this.cleanup();
    }
  }

  // ── Transcript extraction ────────────────────────────────────

  private now(): string {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  /**
   * Handles verto.display messages — the real transcript channel.
   *
   * Wire format: params.display_name is a JSON *string* that parses to
   * { transcription, msgId, eventName? }. msgId.includes("USER") means
   * the user just said something; msgId.includes("AVATAR") means the AI
   * is streaming a response (many chunks share one AVATAR msgId and
   * accumulate). A display with eventName:"play_end" marks end of the
   * AI turn — we finalize whatever we've accumulated.
   */
  private handleDisplay(msg: Record<string, unknown>): void {
    const params = msg.params as Record<string, unknown> | undefined;
    const raw = params?.display_name as string | undefined;
    if (!raw) return;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    const transcription = data.transcription as string | undefined;
    const msgId = data.msgId as string | undefined;
    const eventName = data.eventName as string | undefined;

    // Speaking indicator also rides on display events
    if (eventName === "play_start") this.cb.onSpeakingChange?.(true);
    if (eventName === "play_end") {
      this.cb.onSpeakingChange?.(false);
      // Finalize whatever AI chunk we were streaming
      if (this.aiChunk && this.aiMsgId) {
        this.cb.onTranscript?.({
          id: this.aiMsgId,
          speaker: "agent",
          text: this.aiChunk,
          time: this.now(),
          isFinal: true,
        });
        this.aiChunk = "";
        this.aiMsgId = "";
      }
    }

    if (!this.cb.onTranscript) return;
    if (!transcription || transcription.length === 0 || !msgId) return;

    if (msgId.includes("USER")) {
      this.cb.onTranscript({
        id: msgId,
        speaker: "user",
        text: transcription,
        time: this.now(),
        isFinal: true,
      });
      return;
    }

    if (msgId.includes("AVATAR")) {
      // New AI turn — reset the accumulator
      if (this.aiMsgId !== msgId) {
        this.aiMsgId = msgId;
        this.aiChunk = "";
      }
      this.aiChunk += transcription;
      this.cb.onTranscript({
        id: msgId,
        speaker: "agent",
        text: this.aiChunk,
        time: this.now(),
        isFinal: false,
      });
    }
  }

  // ── Cleanup ─────────────────────────────────────────────────

  private cleanup(): void {
    this.destroyed = true;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
    if (this.remoteAudio) {
      this.remoteAudio.pause();
      this.remoteAudio.srcObject = null;
      this.remoteAudio.remove();
      this.remoteAudio = null;
    }
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) {
      this.ws.close();
    }
    this.ws = null;
  }
}
