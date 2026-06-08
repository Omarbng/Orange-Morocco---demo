import { useCallback, useEffect, useRef, useState } from "react";
import {
  GeminiShareClient,
  type CallStatus,
  type TranscriptEntry,
} from "./geminiShare";
import { getCallConfig, type Agent } from "./agents";

interface Props {
  agent: Agent;
  onEnd: () => void;
}

const STATUS_TEXT: Record<CallStatus, string> = {
  idle: "",
  "requesting-mic": "Requesting microphone…",
  connecting: "Connecting…",
  ringing: "Ringing…",
  connected: "In Call",
  ended: "Call ended",
  error: "Connection failed",
};

/**
 * Native in-page call UI. Two-column layout:
 *   left  — large portrait + name + status, with a soft voice-reactive aura
 *   right — live transcript as clean flowing text (no boxes, no bubbles)
 * End Call docked bottom-center.
 */
export const NativeCall: React.FC<Props> = ({ agent, onEnd }) => {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const clientRef = useRef<GeminiShareClient | null>(null);
  const timerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const userScrolledRef = useRef(false);

  const portraitSrc = `/${agent.id}.png`;

  useEffect(() => {
    if (userScrolledRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolledRef.current = !atBottom;
  };

  useEffect(() => {
    let callConfig;
    try {
      callConfig = getCallConfig(agent);
    } catch (e) {
      setStatus("error");
      setErrMsg(e instanceof Error ? e.message : "Invalid agent config");
      return;
    }

    const client = new GeminiShareClient({
      onStatusChange: (s, msg) => {
        setStatus(s);
        if (msg) setErrMsg(msg);
        if (s === "connected") {
          timerRef.current = window.setInterval(
            () => setSeconds((prev) => prev + 1),
            1000
          );
        }
        if (s === "ended" || s === "error") {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      },
      onSpeakingChange: (speaking) => setAiSpeaking(speaking),
      onTranscript: (entry) => {
        setTranscript((prev) => {
          const existing = prev.findIndex((e) => e.id === entry.id);
          if (existing !== -1) {
            const updated = [...prev];
            updated[existing] = entry;
            return updated;
          }
          return [...prev, entry];
        });
      },
    });

    clientRef.current = client;
    client.startCall(callConfig);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      client.destroy();
    };
  }, [agent]);

  const handleEndCall = useCallback(() => {
    clientRef.current?.endCall();
    setTimeout(onEnd, 600);
  }, [onEnd]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const isActive =
    status === "connected" ||
    status === "ringing" ||
    status === "connecting" ||
    status === "requesting-mic";

  return (
    <div className="native-call" role="dialog" aria-label={`Call with ${agent.name}`}>
      <div className="call-stage">
        {/* ── Left: large portrait + identity ───────────────── */}
        <div className="call-stage-left">
          <div
            className={`stage-portrait ${aiSpeaking ? "speaking" : ""} ${status}`}
          >
            <div className="stage-aura" aria-hidden />
            {!imgFailed ? (
              <img
                src={portraitSrc}
                alt={agent.name}
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="stage-portrait-fallback" aria-hidden />
            )}
          </div>

          <div className="stage-identity">
            <div className="stage-eyebrow">Orange Maroc · EVA</div>
            <div className="stage-name">{agent.name}</div>
            <div className={`stage-status ${status}`}>
              {status === "connected" ? (
                <>
                  <span className="stage-dot" />
                  {STATUS_TEXT[status]} · {mm}:{ss}
                </>
              ) : status === "error" ? (
                errMsg || STATUS_TEXT[status]
              ) : (
                STATUS_TEXT[status]
              )}
            </div>
          </div>
        </div>

        {/* ── Right: clean flowing transcript ───────────────── */}
        <div className="call-stage-right">
          <div
            className="transcript-stream"
            ref={scrollRef}
            onScroll={handleScroll}
          >
            {transcript.length === 0 && (
              <div className="transcript-stream-hint">
                {status === "connected"
                  ? "Listening…"
                  : "Transcript will appear here as you speak."}
              </div>
            )}
            {transcript.map((entry) => (
              <p
                key={entry.id}
                className={`transcript-line ${entry.speaker} ${entry.isFinal ? "final" : "streaming"}`}
              >
                <span className="transcript-line-speaker">
                  {entry.speaker === "agent" ? "EVA" : "You"}
                </span>
                <span className="transcript-line-text">{entry.text}</span>
              </p>
            ))}
          </div>
          {aiSpeaking && (
            <div className="transcript-speaking-pill">
              <span className="transcript-speaking-dot" />
              EVA is speaking
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom controls ───────────────────────────────── */}
      {isActive && (
        <button
          type="button"
          className="native-call-end"
          onClick={handleEndCall}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
              fill="white"
            />
          </svg>
          End Call
        </button>
      )}

      {(status === "ended" || status === "error") && (
        <button type="button" className="native-call-back" onClick={onEnd}>
          ← Back to {agent.name}
        </button>
      )}
    </div>
  );
};
