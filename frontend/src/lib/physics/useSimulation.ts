import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  engineErrorMessage,
  loadPhysicsEngine,
  readState,
  type PhysicsModule,
  type PhysicsObjectState,
  type PhysicsState,
} from "./engine";

export type EngineStatus = "loading" | "ready" | "error";

/** Who last shaped the C++ world. The dashboard may only replace its own demo. */
export type WorldOwner = "none" | "demo" | "user";

export type VelocityPoint = { time: number; velocities: Record<number, number> };

/** Read-only handle that lets a canvas draw every frame without React renders. */
export interface LiveState {
  stateRef: { readonly current: PhysicsState | null };
  subscribe: (listener: () => void) => () => void;
}

/** Everything needed to rebuild the world through the public C++ API. */
interface Checkpoint {
  gravity: number;
  gravityEnabled: boolean;
  friction: number;
  frictionEnabled: boolean;
  timeStep: number;
  objects: PhysicsObjectState[];
}

const UI_INTERVAL_MS = 100; // React-visible state refresh while running (10 Hz)
const HISTORY_INTERVAL_S = 0.1; // graph sampling interval in simulation time
const HISTORY_LIMIT = 100;
const DEMO_DURATION_S = 9;

/** Recreate bodies from a checkpoint using only the existing C++ API. */
function restoreCheckpoint(m: PhysicsModule, cp: Checkpoint): Map<number, number> {
  const idMap = new Map<number, number>();
  m.reset();
  if (cp.gravityEnabled) m.setGravity(cp.gravity);
  else m.disableGravity();
  if (cp.frictionEnabled) m.setFriction(cp.friction);
  else m.disableFriction();
  m.setTimeStep(cp.timeStep);
  for (const o of cp.objects) {
    const p = o.shapeParams;
    let id = -1;
    if (o.shape === "Circle") {
      id = m.createCircle(o.isStatic, o.mass, o.pos.x, o.pos.y, p[0] ?? o.radius, o.vel.x, o.vel.y);
    } else if (o.shape === "Rectangle") {
      id = m.createRectangle(
        o.isStatic,
        o.mass,
        o.pos.x,
        o.pos.y,
        p[0] ?? 2,
        p[1] ?? 2,
        o.vel.x,
        o.vel.y,
      );
    } else if (o.shape === "Triangle") {
      id = m.createTriangle(
        o.isStatic,
        o.mass,
        o.pos.x,
        o.pos.y,
        p[0] ?? 2,
        p[1] ?? 2,
        o.vel.x,
        o.vel.y,
      );
    }
    if (id >= 0) idMap.set(o.id, id);
  }
  m.pause();
  return idMap;
}

/** Three projectiles launched at different angles, used by the dashboard hero. */
function buildDemoScene(m: PhysicsModule) {
  m.reset();
  m.setGravity(9.8);
  m.disableFriction();
  m.createCircle(false, 1, 5, 2, 1.3, 13, 25);
  m.createCircle(false, 2, 5, 2, 1.6, 20, 18);
  m.createCircle(false, 3, 5, 2, 1.9, 27, 9);
  m.pause();
}

/**
 * Drives the C++ WebAssembly engine. The C++ world is the single source of
 * truth: this hook only forwards commands and reads snapshots back.
 *
 * Performance: the 60 Hz animation loop writes into `stateRef` and notifies
 * canvas subscribers directly. React-visible `state` is refreshed at 10 Hz
 * while running (and immediately after any command), so panels do not
 * re-render on every physics frame.
 */
export function useSimulation() {
  const moduleRef = useRef<PhysicsModule | null>(null);
  const stateRef = useRef<PhysicsState | null>(null);
  const listenersRef = useRef(new Set<() => void>());
  const ownerRef = useRef<WorldOwner>("none");
  const checkpointRef = useRef<Checkpoint | null>(null);

  const [status, setStatus] = useState<EngineStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<PhysicsState | null>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [velocityHistory, setVelocityHistory] = useState<VelocityPoint[]>([]);

  const lastSampleRef = useRef(0);
  const runningRef = useRef(false);
  const speedRef = useRef(1);
  speedRef.current = speed;

  const live = useMemo<LiveState>(
    () => ({
      stateRef,
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [],
  );

  /** Publish a fresh snapshot to canvases (always) and React (when asked). */
  const publish = useCallback((next: PhysicsState, updateReact: boolean) => {
    stateRef.current = next;
    listenersRef.current.forEach((listener) => listener());
    if (updateReact) setState(next);
  }, []);

  const clearHistory = useCallback(() => {
    setVelocityHistory([]);
    lastSampleRef.current = 0;
  }, []);

  const setRunningBoth = useCallback((value: boolean) => {
    runningRef.current = value;
    setRunning(value);
  }, []);

  /** Safely invoke an engine operation and surface C++ exceptions to the UI. */
  const call = useCallback(
    <T>(fn: (m: PhysicsModule) => T, options?: { system?: boolean }): T | undefined => {
      const m = moduleRef.current;
      if (!m) {
        toast.error("The C++ engine is still loading.");
        return undefined;
      }
      try {
        const result = fn(m);
        publish(readState(m), true);
        if (!options?.system) ownerRef.current = "user";
        return result;
      } catch (e) {
        toast.error(engineErrorMessage(e));
        return undefined;
      }
    },
    [publish],
  );

  const refresh = useCallback(() => {
    const m = moduleRef.current;
    if (!m) return;
    try {
      publish(readState(m), true);
    } catch (e) {
      console.error(e);
    }
  }, [publish]);

  useEffect(() => {
    let cancelled = false;
    loadPhysicsEngine()
      .then((m) => {
        if (cancelled) return;
        moduleRef.current = m;
        try {
          m.pause();
        } catch {
          /* ignore */
        }
        setStatus("ready");
        publish(readState(m), true);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(engineErrorMessage(e));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [publish]);

  /** Remember the world as it is right now so Reset can restore it. */
  const captureCheckpoint = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.time !== 0) return;
    checkpointRef.current = {
      gravity: s.gravity,
      gravityEnabled: s.gravityEnabled,
      friction: s.friction,
      frictionEnabled: s.frictionEnabled,
      timeStep: s.timeStep,
      objects: s.objects.map((o) => ({
        ...o,
        pos: { ...o.pos },
        vel: { ...o.vel },
        acc: { ...o.acc },
      })),
    };
  }, []);

  // Animation loop: advances the C++ engine, never simulates in JS.
  useEffect(() => {
    if (status !== "ready") return;
    let frame = 0;
    let last = performance.now();
    let lastUi = 0;
    let accumulator = 0;

    const tick = (now: number) => {
      const elapsed = Math.min((now - last) / 1000, 0.25);
      last = now;
      const m = moduleRef.current;
      if (m) {
        let stepped = false;
        if (runningRef.current) {
          const dt = m.getTimeStep() || 0.05;
          accumulator += (elapsed * speedRef.current) / dt;
          const steps = Math.min(8, Math.floor(accumulator));
          if (steps > 0) {
            accumulator -= steps;
            try {
              m.step(steps);
              stepped = true;
            } catch (e) {
              setRunningBoth(false);
              toast.error(engineErrorMessage(e));
            }
          }
        }

        if (stepped) {
          try {
            let next = readState(m);

            // The dashboard demo loops by rebuilding its own scene.
            if (ownerRef.current === "demo" && next.time > DEMO_DURATION_S) {
              buildDemoScene(m);
              m.resume();
              next = readState(m);
            }

            const dueForUi = now - lastUi >= UI_INTERVAL_MS;
            if (dueForUi) lastUi = now;
            publish(next, dueForUi);

            if (next.time < lastSampleRef.current) lastSampleRef.current = 0;
            if (next.time - lastSampleRef.current >= HISTORY_INTERVAL_S) {
              lastSampleRef.current = next.time;
              const velocities: Record<number, number> = {};
              for (const o of next.objects) {
                if (!o.isStatic) velocities[o.id] = Math.hypot(o.vel.x, o.vel.y);
              }
              setVelocityHistory((h) =>
                [...h, { time: next.time, velocities }].slice(-HISTORY_LIMIT),
              );
            }
          } catch {
            /* ignore transient read errors */
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status, publish, setRunningBoth]);

  useEffect(() => {
    return () => {
      try {
        moduleRef.current?.pause();
      } catch {
        /* ignore */
      }
      runningRef.current = false;
    };
  }, []);

  const run = useCallback(() => {
    captureCheckpoint();
    ownerRef.current = "user";
    call((m) => m.resume());
    setRunningBoth(true);
  }, [call, captureCheckpoint, setRunningBoth]);

  const pause = useCallback(() => {
    setRunningBoth(false);
    call((m) => m.pause(), { system: true });
  }, [call, setRunningBoth]);

  const stepOnce = useCallback(() => {
    captureCheckpoint();
    setRunningBoth(false);
    call((m) => {
      m.resume();
      m.step(1);
      m.pause();
    });
  }, [call, captureCheckpoint, setRunningBoth]);

  const stop = pause;

  /** Clears the whole world (all bodies). */
  const resetWorld = useCallback(() => {
    setRunningBoth(false);
    clearHistory();
    checkpointRef.current = null;
    call((m) => {
      m.reset();
      m.pause();
    });
  }, [call, clearHistory, setRunningBoth]);

  /**
   * Restores the world to the state it had when the run started. Returns a
   * map from old body ids to new ids (or null if there is nothing to restore).
   */
  const restart = useCallback((): Map<number, number> | null => {
    const cp = checkpointRef.current;
    if (!cp) return null;
    setRunningBoth(false);
    clearHistory();
    return call((m) => restoreCheckpoint(m, cp)) ?? null;
  }, [call, clearHistory, setRunningBoth]);

  const undo = useCallback(() => {
    const ok = call((m) => m.undo());
    if (ok === false) toast.message("Nothing left to undo in the C++ world.");
  }, [call]);

  /** Loads (or reloads) the dashboard demo through the C++ API and runs it. */
  const startDemo = useCallback(() => {
    clearHistory();
    checkpointRef.current = null;
    call(
      (m) => {
        buildDemoScene(m);
        m.resume();
      },
      { system: true },
    );
    ownerRef.current = "demo";
    setRunningBoth(true);
  }, [call, clearHistory, setRunningBoth]);

  /** Stops the dashboard demo (but only if it is still the demo that owns the world). */
  const releaseDemo = useCallback(() => {
    if (ownerRef.current === "demo") {
      setRunningBoth(false);
      call((m) => m.pause(), { system: true });
    }
  }, [call, setRunningBoth]);

  /** Called when the user takes over the world (e.g. opens the Lab). */
  const adoptWorld = useCallback(() => {
    if (ownerRef.current === "demo") {
      ownerRef.current = "user";
      setRunningBoth(false);
      call((m) => m.pause(), { system: true });
    }
  }, [call, setRunningBoth]);

  return {
    module: moduleRef,
    status,
    error,
    state,
    live,
    ownerRef,
    velocityHistory,
    running,
    speed,
    setSpeed,
    call,
    refresh,
    run,
    pause,
    stepOnce,
    stop,
    resetWorld,
    restart,
    undo,
    startDemo,
    releaseDemo,
    adoptWorld,
    clearHistory,
  };
}

export type Simulation = ReturnType<typeof useSimulation>;
