import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  random,
} from "remotion";
import { tokens } from "./tokens";

// ──────────────────────────────────────────────────────────────
// 2D backdrop — animated gradient + drifting particles + pulsing
// orb. Purely ambient: this composition is rendered as a full-
// bleed backdrop behind the real UI, so no text or logo chrome.
// ──────────────────────────────────────────────────────────────

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const t = frame / durationInFrames;
  const angle = interpolate(t, [0, 1], [120, 150]);
  const stop = interpolate(t, [0, 1], [55, 75]);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(${angle}deg, ${tokens.bgDeep} 0%, ${tokens.bgMid} ${stop - 30}%, ${tokens.bgHi} ${stop}%, ${tokens.bgMid} 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "-10%",
          top: "-10%",
          width: width * 0.8,
          height: height * 1.3,
          background: `radial-gradient(circle, ${tokens.accentSoft}66 0%, transparent 60%)`,
          filter: "blur(40px)",
          transform: `translateY(${Math.sin(t * Math.PI * 2) * 20}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
        }}
      />
    </AbsoluteFill>
  );
};

const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const count = 60;

  return (
    <AbsoluteFill>
      {Array.from({ length: count }).map((_, i) => {
        const seed = `p${i}`;
        const startX = random(seed + "x") * width * 1.5;
        const y = random(seed + "y") * height;
        const size = 2 + random(seed + "s") * 5;
        const speed = 0.5 + random(seed + "v") * 2;
        const x =
          ((startX - frame * speed * 3) % (width + 200) + width + 200) %
          (width + 200) - 100;
        const op = 0.15 + random(seed + "o") * 0.5;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: tokens.accentSoft,
              opacity: op,
              filter: `blur(${size / 3}px)`,
              boxShadow: `0 0 ${size * 4}px ${tokens.accentSoft}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const CenterOrb: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const in_ = spring({ frame: frame - 10, fps, config: { damping: 22 } });

  const float = Math.sin(frame / 30) * 8;
  const breathe = 1 + Math.sin(frame / 45) * 0.01;

  return (
    <div
      style={{
        position: "absolute",
        right: -60,
        top: "10%",
        width: height * 0.75,
        height: height * 0.9,
        opacity: in_,
        transform: `translateY(${float + (1 - in_) * 40}px) scale(${breathe})`,
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: i * 40,
            borderRadius: "50%",
            border: `2px solid ${tokens.accentSoft}${(44 - i * 10).toString(16)}`,
            transform: `rotate(${frame * (1 + i * 0.3)}deg)`,
            borderStyle: i % 2 ? "dashed" : "solid",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 30%, ${tokens.accentSoft}, ${tokens.accent} 40%, ${tokens.bgDeep} 90%)`,
          boxShadow: `0 0 120px ${tokens.accent}, inset 0 0 60px ${tokens.accentSoft}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 180,
          borderRadius: "50%",
          background: `repeating-linear-gradient(0deg, transparent 0px, transparent 4px, ${tokens.accentSoft}18 4px, ${tokens.accentSoft}18 5px)`,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
};

export const EvaHero2D: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: tokens.bgDeep }}>
      <Background />
      <Particles />
      <CenterOrb />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
