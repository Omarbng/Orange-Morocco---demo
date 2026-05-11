/**
 * Drop this into your landing page (Next.js/Vite/CRA — any React app).
 *
 *   import { EvaInteractivePlayer } from "./EvaInteractivePlayer";
 *   <EvaInteractivePlayer />
 *
 * It renders the same composition as EvaHero2D, but as an INTERACTIVE
 * React component — no MP4, no CDN, no video file. The user can:
 *   • hover to repaint the magenta glow under the cursor
 *   • click anywhere to rewind + replay
 *   • scroll-link the playhead to page scroll (see ScrollScrubbedEva below)
 *
 * Player-in-page is Remotion's superpower: same code, video export AND live widget.
 */
import { Player, PlayerRef } from "@remotion/player";
import { useRef, useState, useCallback } from "react";
import { EvaHero2D } from "./EvaHero2D";

export const EvaInteractivePlayer: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  const onMove = useCallback((e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    });
  }, []);

  const onClick = useCallback(() => {
    playerRef.current?.seekTo(0);
    playerRef.current?.play();
  }, []);

  return (
    <div
      onMouseMove={onMove}
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        cursor: "pointer",
      }}
    >
      <Player
        ref={playerRef}
        component={EvaHero2D}
        durationInFrames={180}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        autoPlay
        loop
        controls={false}
        style={{ width: "100%", height: "100%" }}
      />
      {/* Mouse-tracked glow overlay — adds interactivity on top of the video */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(circle at ${mouse.x * 100}% ${mouse.y * 100}%, rgba(255, 106, 184, 0.3), transparent 40%)`,
          transition: "background 0.15s ease",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
};

/**
 * BONUS: Scroll-scrubbed variant — the Figma design reveals as the user scrolls.
 * Use this as the hero background of your landing page for a "scrollytelling" effect.
 */
export const EvaScrollScrubbed: React.FC<{ containerRef: React.RefObject<HTMLElement> }> = ({
  containerRef,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const [frame, setFrame] = useState(0);

  // Sync playhead to scroll position of the section
  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const progress = Math.max(
      0,
      Math.min(1, -rect.top / (rect.height - window.innerHeight)),
    );
    const f = Math.floor(progress * 179);
    setFrame(f);
    playerRef.current?.seekTo(f);
    playerRef.current?.pause();
  }, [containerRef]);

  // Attach/detach in a useEffect in the consumer; this is a minimal demo.
  if (typeof window !== "undefined") {
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  return (
    <Player
      ref={playerRef}
      component={EvaHero2D}
      durationInFrames={180}
      compositionWidth={1920}
      compositionHeight={1080}
      fps={30}
      controls={false}
      style={{ width: "100%", height: "100%" }}
      initialFrame={frame}
    />
  );
};
