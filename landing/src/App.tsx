import { useCallback, useEffect, useState } from "react";
import { Landing } from "./Landing";
import { CallScreen } from "./CallScreen";
import { Footer } from "./Footer";
import type { Agent } from "./agents";

type View = "landing" | "call";

export const App: React.FC = () => {
  const [view, setView] = useState<View>("landing");
  const [selected, setSelected] = useState<Agent | null>(null);

  // Keep browser back/forward in sync with our view state.
  useEffect(() => {
    const onPop = () => {
      setView("landing");
      setSelected(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const goToLanding = useCallback(() => {
    window.history.pushState({}, "", "/");
    setSelected(null);
    setView("landing");
  }, []);

  const goToCall = useCallback((agent: Agent) => {
    window.history.pushState({}, "", "/");
    setSelected(agent);
    setView("call");
  }, []);

  return (
    <>
      <div className="ambient-bg" />
      <div className="ambient-grain" />
      <div className="ambient-vignette" />

      {view === "landing" && <Landing onSelect={goToCall} />}
      {view === "call" && selected && (
        <CallScreen agent={selected} onBack={goToLanding} />
      )}

      <Footer />
    </>
  );
};
