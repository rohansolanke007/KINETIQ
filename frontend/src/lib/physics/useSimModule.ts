import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supportsSimulations, type FbdData, type PhysicsModule } from "./engine";
import type { Simulation } from "./useSimulation";

/** Per-frame feed for a canvas, so drawing never waits on React renders. */
export interface LiveFeed<S> {
  stateRef: { readonly current: S | null };
  subscribe: (listener: () => void) => () => void;
}

const UI_INTERVAL_MS = 100;
/** Graph data is heavier to render than the numeric readouts, so it refreshes half as often. */
const SERIES_INTERVAL_MS = 200;
/** Most recent samples handed to the live graphs (60 per second -> 12 s). */
const SERIES_ROWS = 720;

function parse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Drives one dedicated C++ Simulation (projectile, pendulum, ...) created
 * through simCreate(type). The C++ object owns all physics, parameters and
 * valid ranges; this hook only forwards commands and reads snapshots.
 *
 * `S` is the per-frame state shape and `I` the info shape (analytic results
 * and parameter metadata, refreshed whenever a parameter changes).
 */
export function useSimModule<S extends { finished: boolean; time: number }, I>(
  host: Simulation,
  /** Simulation type to create, or null for none (the Analytics page can show the sandbox instead). */
  type: string | null,
  options: { seriesRows?: number } = {},
) {
  const seriesRows = options.seriesRows ?? SERIES_ROWS;
  const seriesRowsRef = useRef(seriesRows);
  seriesRowsRef.current = seriesRows;
  const { status, module } = host;
  const [info, setInfo] = useState<I | null>(null);
  const [state, setState] = useState<S | null>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [forces, setForces] = useState<FbdData | null>(null);

  const stateRef = useRef<S | null>(null);
  const listeners = useRef(new Set<() => void>());
  const runningRef = useRef(false);
  const speedRef = useRef(1);
  speedRef.current = speed;

  const live = useMemo<LiveFeed<S>>(
    () => ({
      stateRef,
      subscribe: (l) => {
        listeners.current.add(l);
        return () => {
          listeners.current.delete(l);
        };
      },
    }),
    [],
  );

  const setRunningBoth = useCallback((value: boolean) => {
    runningRef.current = value;
    setRunning(value);
  }, []);

  const publish = useCallback((next: S | null, updateReact: boolean) => {
    stateRef.current = next;
    listeners.current.forEach((l) => l());
    if (updateReact) setState(next);
  }, []);

  /** Pulls the recorded series and the free-body diagram from C++. */
  const lastSeriesRef = useRef(0);
  const refreshDerived = useCallback((m: PhysicsModule, force = true) => {
    setForces(parse<FbdData>(m.simForcesJSON()));
    const now = performance.now();
    if (force || now - lastSeriesRef.current >= SERIES_INTERVAL_MS) {
      lastSeriesRef.current = now;
      setSeries(parse<SeriesData>(m.simSeriesJSON(seriesRowsRef.current)));
    }
  }, []);

  const readAll = useCallback(
    (m: PhysicsModule) => {
      setInfo(parse<I>(m.simInfoJSON()));
      refreshDerived(m);
      publish(parse<S>(m.simStateJSON()), true);
    },
    [publish, refreshDerived],
  );

  // Create the C++ simulation when the engine is ready; destroy it on leave.
  useEffect(() => {
    if (status !== "ready") return;
    const m = module.current;
    if (!m) return;
    if (type === null) {
      setInfo(null);
      setSeries(null);
      setForces(null);
      publish(null, true);
      return;
    }
    if (!supportsSimulations(m)) {
      setError(
        "This build of physics_engine.wasm predates the Simulation API. Run `make web` in backend/ to rebuild it.",
      );
      return;
    }
    const failure = m.simCreate(type);
    if (failure) {
      setError(failure);
      return;
    }
    setError(null);
    readAll(m);
    return () => {
      setRunningBoth(false);
      m.simDestroy();
      publish(null, false);
    };
  }, [status, module, type, readAll, publish, setRunningBoth]);

  // Fixed-timestep driver: hands elapsed real time to C++, which steps itself.
  useEffect(() => {
    if (status !== "ready") return;
    let frame = 0;
    let last = performance.now();
    let lastUi = 0;
    const tick = (now: number) => {
      const elapsed = Math.min((now - last) / 1000, 0.25);
      last = now;
      const m = module.current;
      if (m && runningRef.current && supportsSimulations(m)) {
        m.simAdvance(elapsed * speedRef.current);
        const next = parse<S>(m.simStateJSON());
        if (next) {
          const done = next.finished;
          const due = done || now - lastUi >= UI_INTERVAL_MS;
          if (due) {
            lastUi = now;
            // the final frame always refreshes everything so a finished run shows its last samples
            refreshDerived(m, done);
          }
          publish(next, due);
          if (done) setRunningBoth(false);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status, module, publish, setRunningBoth, refreshDerived]);

  /** Applies a parameter in C++. Resets the run and returns the error text, if any. */
  const setParameter = useCallback(
    (name: string, value: number): string => {
      const m = module.current;
      if (!m) return "The C++ engine is still loading.";
      const failure = m.simSetParameter(name, value);
      if (failure) {
        toast.error(failure);
        return failure;
      }
      setRunningBoth(false);
      readAll(m);
      return "";
    },
    [module, readAll, setRunningBoth],
  );

  const reset = useCallback(() => {
    const m = module.current;
    if (!m) return;
    setRunningBoth(false);
    const failure = m.simReset();
    if (failure) toast.error(failure);
    readAll(m);
  }, [module, readAll, setRunningBoth]);

  const play = useCallback(() => {
    const m = module.current;
    if (!m) return;
    // Pressing Play after a finished run starts a fresh one.
    if (stateRef.current?.finished) {
      m.simReset();
      readAll(m);
    }
    setRunningBoth(true);
  }, [module, readAll, setRunningBoth]);

  const pause = useCallback(() => setRunningBoth(false), [setRunningBoth]);

  const stepFrame = useCallback(() => {
    const m = module.current;
    if (!m) return;
    setRunningBoth(false);
    if (stateRef.current?.finished) m.simReset();
    m.simStepFrame();
    refreshDerived(m);
    publish(parse<S>(m.simStateJSON()), true);
  }, [module, publish, setRunningBoth, refreshDerived]);

  /** Full recording (maxRows = 0) for export; the live graphs use the cheaper tail. */
  const fetchSeries = useCallback(
    (maxRows = 0) => {
      const m = module.current;
      return m ? parse<SeriesData>(m.simSeriesJSON(maxRows)) : null;
    },
    [module],
  );

  return {
    info,
    state,
    series,
    forces,
    live,
    running,
    speed,
    setSpeed,
    error,
    setParameter,
    reset,
    play,
    pause,
    stepFrame,
    fetchSeries,
  };
}

export interface SeriesData {
  channels: string[];
  units: string[];
  rows: number[][];
}
