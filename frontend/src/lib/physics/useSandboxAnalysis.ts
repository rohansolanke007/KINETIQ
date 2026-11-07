import { useEffect, useState } from "react";
import type { SandboxAnalysis } from "./engine";
import type { SeriesData } from "./useSimModule";
import type { Simulation } from "./useSimulation";

/**
 * Energy and momentum of the sandbox world, read from the C++ engine whenever
 * the (throttled) simulation state changes.
 */
export function useSandboxAnalysis(sim: Simulation) {
  const [analysis, setAnalysis] = useState<SandboxAnalysis | null>(null);
  const [series, setSeries] = useState<SeriesData | null>(null);
  const { module } = sim;

  useEffect(() => {
    const m = module.current;
    if (!m || typeof m.getAnalysisJSON !== "function") return;
    try {
      setAnalysis(JSON.parse(m.getAnalysisJSON()) as SandboxAnalysis);
      setSeries(JSON.parse(m.getAnalysisSeriesJSON(720)) as SeriesData);
    } catch {
      /* transient read failure: keep the last values */
    }
  }, [sim.state, module]);

  return { analysis, series };
}
