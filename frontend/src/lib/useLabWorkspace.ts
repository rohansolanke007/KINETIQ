import { useEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";

/** Collapses the sidebar while a workspace page is open and restores it on leave. */
export function useCollapsedSidebar() {
  const { open, setOpen } = useSidebar();
  const initial = useRef(open);
  useEffect(() => {
    const previous = initial.current;
    setOpen(false);
    return () => setOpen(previous);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
    el.isContentEditable ||
    !!el.closest("[role=slider]")
  );
}

/** Space = play/pause, N = step, R = reset. Ignored while typing or dragging a slider. */
export function useLabShortcuts({
  enabled,
  running,
  onPlay,
  onPause,
  onStep,
  onReset,
}: {
  enabled: boolean;
  running: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || !enabled) return;
      if (e.code === "Space") {
        e.preventDefault();
        // Drop focus from a clicked button so Space does not also "press" it.
        if ((e.target as HTMLElement | null)?.tagName === "BUTTON")
          (e.target as HTMLElement).blur();
        if (running) onPause();
        else onPlay();
      } else if (e.key === "n" || e.key === "N") {
        onStep();
      } else if (e.key === "r" || e.key === "R") {
        onReset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, running, onPlay, onPause, onStep, onReset]);
}
