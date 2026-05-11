import { useEffect, useMemo, useState } from "react";
import { agents, type Agent } from "./agents";
import { AgentCard } from "./AgentCard";
import { Particles } from "./Particles";
import { TopBar } from "./TopBar";
import { useCyclingTypewriter } from "./useTypewriter";

interface Props {
  onSelect: (agent: Agent) => void;
}

/**
 * Landing screen.
 *
 * Intro choreography:
 *  1. "Hi, I'm MIA" appears centered & large (entry animation).
 *  2. After a short hold, it transitions to its hero-headline position
 *     and shrinks to its resting size — same element, no fade-out.
 *  3. Subtitle and agent cards fade in below it.
 */
export const Landing: React.FC<Props> = ({ onSelect }) => {
  const phrases = useMemo(
    () => [
      "Ask me Anything",
      "Every voice. Every language.",
      "Your voice, answered",
      "Ready when you are",
    ],
    []
  );

  // Phases:
  //   "intro"    — headline centered + large
  //   "settled"  — headline at hero spot + resting size; rest of UI fades in
  const [phase, setPhase] = useState<"intro" | "settled">("intro");

  useEffect(() => {
    // Entry (~0.8s) + hold (~0.7s) → 1.5s before we start settling.
    const t = window.setTimeout(() => setPhase("settled"), 1500);
    return () => window.clearTimeout(t);
  }, []);

  const sub = useCyclingTypewriter(phrases, 2500, 55, 25, 2600);

  return (
    <div className={`landing is-${phase}`}>
      <TopBar />
      <Particles />

      {/* Persistent hero headline. Lives as a fixed-position element so we
          can transition it between "centered & big" (intro) and "hero
          slot & resting size" (settled). */}
      <h1 className={`mia-headline is-${phase}`}>
        Hi, I&apos;m <span className="mia-headline-accent">EVA</span>
      </h1>

      <section className="hero">
        <div className="hero-sub">
          {sub}
          <span className="cursor cursor-sub" aria-hidden>
            |
          </span>
        </div>
      </section>

      <section className="agents">
        {agents.map((agent, i) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onSelect={onSelect}
            index={i}
          />
        ))}
      </section>
    </div>
  );
};
