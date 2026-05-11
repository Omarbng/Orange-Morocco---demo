import { useState } from "react";
import type { Agent } from "./agents";
import { NativeCall } from "./NativeCall";

interface Props {
  agent: Agent;
  onBack: () => void;
}

/**
 * Pre-call screen — large portrait + name + description + "Start Call".
 * Background is a calm voice-themed aurora (sweeping bars + soft radial
 * glows) that hints at audio without the heavy Remotion 3D backdrop.
 */
export const CallScreen: React.FC<Props> = ({ agent, onBack }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [callActive, setCallActive] = useState(false);

  const portraitSrc = `/${agent.id}.png`;

  return (
    <div className={`call-screen ${callActive ? "is-in-call" : ""}`}>
      {!callActive && (
        <button
          type="button"
          className="call-back-btn"
          onClick={onBack}
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>
      )}

      <div className="call-content" aria-hidden={callActive}>
        <div className="call-portrait-frameless">
          {!imgFailed ? (
            <img
              src={portraitSrc}
              alt={agent.name}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="call-portrait-fallback" aria-hidden>
              <div className="card-portrait-fallback">
                <div className="ring r2" />
                <div className="ring r1" />
                <div className="orb" />
              </div>
            </div>
          )}
        </div>

        <div className="call-details">
          <div className="call-eyebrow">Orange Maroc · EVA</div>
          <div className="call-name">{agent.name}</div>
          {agent.bullets ? (
            <ul className="call-bullets">
              {agent.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : (
            <div className="call-description">{agent.description}</div>
          )}

          <button
            type="button"
            className="call-button"
            onClick={() => setCallActive(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                fill="white"
              />
            </svg>
            Start Call
          </button>
        </div>
      </div>

      {callActive && (
        <NativeCall agent={agent} onEnd={() => setCallActive(false)} />
      )}
    </div>
  );
};
