import { useMemo } from "react";

/**
 * Drifting magenta particles — purely decorative, CSS-driven so they cost
 * next to nothing at runtime. Mirrors the particle field in EvaHero2D.
 */
export const Particles: React.FC<{ count?: number }> = ({ count = 36 }) => {
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const size = 2 + Math.random() * 5;
      const left = Math.random() * 100;
      const top = 40 + Math.random() * 80;
      const duration = 14 + Math.random() * 22;
      const delay = -Math.random() * duration;
      const dx = -120 - Math.random() * 220;
      const dy = -240 - Math.random() * 260;
      const opacity = 0.2 + Math.random() * 0.45;
      return { i, size, left, top, duration, delay, dx, dy, opacity };
    });
  }, [count]);

  return (
    <div className="particles" aria-hidden>
      {particles.map((p) => (
        <div
          key={p.i}
          className="particle"
          style={
            {
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              "--p-dx": `${p.dx}px`,
              "--p-dy": `${p.dy}px`,
              "--p-opacity": p.opacity,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
