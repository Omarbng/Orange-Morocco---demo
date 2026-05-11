import { useEffect, useState } from "react";

/**
 * Simple typewriter: types `text` one character at a time, starting
 * `startMs` after mount, with `speedMs` between characters. Matches
 * the typewriter feel used in the Remotion EvaHero2D composition.
 */
export const useTypewriter = (
  text: string,
  startMs = 0,
  speedMs = 80
) => {
  const [out, setOut] = useState("");

  useEffect(() => {
    setOut("");
    let interval: number | undefined;
    const start = window.setTimeout(() => {
      let i = 0;
      interval = window.setInterval(() => {
        i++;
        setOut(text.slice(0, i));
        if (i >= text.length) {
          if (interval !== undefined) window.clearInterval(interval);
        }
      }, speedMs);
    }, startMs);

    return () => {
      window.clearTimeout(start);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [text, startMs, speedMs]);

  return out;
};

/**
 * Typewriter that cycles through a list of phrases: types phrase 0,
 * pauses, erases, types phrase 1, etc. Loops forever.
 *
 * Used for the subtitle under "I am EVA" — adds life and signals the
 * multi-lingual / multi-persona nature of the agent without needing
 * extra UI.
 */
export const useCyclingTypewriter = (
  phrases: string[],
  startMs = 0,
  typeSpeedMs = 70,
  eraseSpeedMs = 30,
  pauseMs = 2200
) => {
  const [out, setOut] = useState("");

  useEffect(() => {
    if (phrases.length === 0) return;

    let phraseIdx = 0;
    let charIdx = 0;
    let erasing = false;
    let active = true;
    let timer: number | undefined;

    const tick = () => {
      if (!active) return;
      const current = phrases[phraseIdx]!;

      if (!erasing) {
        charIdx++;
        setOut(current.slice(0, charIdx));
        if (charIdx >= current.length) {
          timer = window.setTimeout(() => {
            erasing = true;
            tick();
          }, pauseMs);
          return;
        }
        timer = window.setTimeout(tick, typeSpeedMs);
      } else {
        charIdx--;
        setOut(current.slice(0, Math.max(0, charIdx)));
        if (charIdx <= 0) {
          erasing = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          timer = window.setTimeout(tick, 400);
          return;
        }
        timer = window.setTimeout(tick, eraseSpeedMs);
      }
    };

    const start = window.setTimeout(tick, startMs);

    return () => {
      active = false;
      window.clearTimeout(start);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [phrases, startMs, typeSpeedMs, eraseSpeedMs, pauseMs]);

  return out;
};
