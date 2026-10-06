import { useEffect, useState } from "react";
import { ActionButton, Field, NumberInput, Panel } from "@/components/physics/ui";
import type { Simulation } from "@/lib/physics/useSimulation";

export function WorldPanel({ sim }: { sim: Simulation }) {
  const state = sim.state;
  const [gravity, setGravity] = useState(9.8);
  const [friction, setFriction] = useState(0.2);
  const [timeStep, setTimeStep] = useState(0.05);

  useEffect(() => {
    if (!state) return;
    setGravity(state.gravity);
    setFriction(state.friction);
    setTimeStep(state.timeStep);
    // Only sync once the engine reports its initial world configuration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.gravity, state?.friction, state?.timeStep]);

  const disabled = sim.status !== "ready";

  return (
    <Panel title="WORLD FORCES" subtitle="Configure forces and simulation parameters">
      <div className="space-y-3">
        <Field label="GRAVITY" suffix={state?.gravityEnabled ? "enabled" : "disabled"}>
          <NumberInput value={gravity} onChange={setGravity} step={0.1} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton disabled={disabled} onClick={() => sim.call((m) => m.setGravity(gravity))}>
            APPLY
          </ActionButton>
          <ActionButton disabled={disabled} onClick={() => sim.call((m) => m.disableGravity())}>
            DISABLE
          </ActionButton>
        </div>

        <Field label="FRICTION" suffix={state?.frictionEnabled ? "enabled" : "disabled"}>
          <NumberInput value={friction} onChange={setFriction} step={0.05} min={0} max={1} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton disabled={disabled} onClick={() => sim.call((m) => m.setFriction(friction))}>
            APPLY
          </ActionButton>
          <ActionButton disabled={disabled} onClick={() => sim.call((m) => m.disableFriction())}>
            DISABLE
          </ActionButton>
        </div>

        <Field label="TIME STEP" suffix="s">
          <NumberInput value={timeStep} onChange={setTimeStep} step={0.005} min={0.001} />
        </Field>
        <ActionButton
          className="w-full"
          disabled={disabled}
          onClick={() => sim.call((m) => m.setTimeStep(timeStep))}
        >
          SET Δt
        </ActionButton>
      </div>
    </Panel>
  );
}
