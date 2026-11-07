import type { ReactNode } from "react";
import { SimulationCtx, StatusCtx } from "./SimulationContext";
import { useSimulation } from "./useSimulation";

/**
 * Hosts the single WebAssembly engine for the whole app so the Dashboard,
 * Lab, Experiments and Analytics all observe the same C++ world.
 */
export function SimulationProvider({ children }: { children: ReactNode }) {
  const sim = useSimulation();
  return (
    <SimulationCtx.Provider value={sim}>
      <StatusCtx.Provider value={sim.status}>{children}</StatusCtx.Provider>
    </SimulationCtx.Provider>
  );
}
