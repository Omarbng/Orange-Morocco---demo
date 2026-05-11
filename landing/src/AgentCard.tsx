import { useRef, useState } from "react";
import type { Agent } from "./agents";

interface Props {
  agent: Agent;
  onSelect: (agent: Agent) => void;
  /** 0 or 1 — used to stagger entry animations */
  index: number;
}

/**
 * Poster-style agent card: the character portrait fills the card,
 * and only the agent name + "Tap to Meet" CTA overlay at the bottom.
 * Interactions: 3D tilt that follows the cursor, magenta glow
 * under the mouse, portrait zoom on hover.
 *
 * Portraits are loaded from `/<agent-id>.png` (drop yours into
 * landing/public/). If missing, the animated orb fallback kicks in.
 */
export const AgentCard: React.FC<Props> = ({ agent, onSelect }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [imgFailed, setImgFailed] = useState(false);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Max ±6° rotation — subtle, premium
    const ry = (x - 0.5) * 12;
    const rx = (0.5 - y) * 10;
    setTilt({ rx, ry });

    // Cursor-tracked glow position for the ::before radial
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };

  const onLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  const portraitSrc = `/${agent.id}.png`;

  return (
    <button
      ref={ref}
      className="card"
      style={{
        transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={() => onSelect(agent)}
      type="button"
      aria-label={`Start a call with ${agent.name}`}
    >
      <div className="card-portrait">
        {!imgFailed ? (
          <img
            src={portraitSrc}
            alt={agent.name}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="card-portrait-fallback" aria-hidden>
            <div className="ring r2" />
            <div className="ring r1" />
            <div className="orb" />
          </div>
        )}
      </div>

      <div className="card-overlay">
        <div className="card-name">{agent.name}</div>
        <div className="card-cta">
          <span className="card-cta-label">Tap to Meet</span>
          <span className="card-cta-arrow" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 5l7 7-7 7"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
};
