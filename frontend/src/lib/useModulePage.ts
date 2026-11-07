import { useEffect } from "react";
import { recordExplored } from "@/lib/progress";
import type { Simulation } from "@/lib/physics/useSimulation";
import { useCollapsedSidebar, useLabShortcuts } from "@/lib/useLabWorkspace";

/**
 * Behaviour shared by every dedicated lab module page: free up width, stop
 * the independent sandbox, log the visit, and wire the keyboard shortcuts.
 * Returns whether the module is ready for interaction.
 */
export function useModulePage(
  host: Simulation,
  sim: {
    running: boolean;
    error: string | null;
    play: () => void;
    pause: () => void;
    stepFrame: () => void;
    reset: () => void;
  },
  meta: { id: string; label: string; href: string },
): boolean {
  useCollapsedSidebar();

  useEffect(() => {
    if (host.status !== "ready") return;
    host.adoptWorld();
    host.pause();
    recordExplored({ kind: "scene", id: meta.id, label: meta.label, href: meta.href });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host.status]);

  const ready = host.status === "ready" && !sim.error;
  useLabShortcuts({
    enabled: ready,
    running: sim.running,
    onPlay: sim.play,
    onPause: sim.pause,
    onStep: sim.stepFrame,
    onReset: sim.reset,
  });
  return ready;
}
