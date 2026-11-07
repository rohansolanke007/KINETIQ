import { createContext, useContext } from "react";
import type { EngineStatus, Simulation } from "./useSimulation";

export const SimulationCtx = createContext<Simulation | null>(null);
export const StatusCtx = createContext<EngineStatus>("loading");

/** Full simulation handle. Re-renders at the throttled UI rate while running. */
export function useSim(): Simulation {
  const sim = useContext(SimulationCtx);
  if (!sim) throw new Error("useSim must be used inside <SimulationProvider>.");
  return sim;
}

/** Engine status only. Changes rarely, so the shell can use it freely. */
export function useEngineStatus(): EngineStatus {
  return useContext(StatusCtx);
}
