import { Panel, SliderField } from "@/components/physics/ui";
import type { Simulation } from "@/lib/physics/useSimulation";

/** Global environment. Sliders are controlled by the C++ world's own values. */
export function WorldPanel({ sim }: { sim: Simulation }) {
  const state = sim.state;
  const disabled = sim.status !== "ready";
  const gravity = state?.gravityEnabled ? state.gravity : 0;
  const friction = state?.frictionEnabled ? state.friction : 0;

  return (
    <Panel title="Environment" subtitle="Applied by the C++ engine immediately">
      <div className="space-y-4">
        <SliderField
          label="Gravity"
          unit="m/s²"
          min={0}
          max={25}
          step={0.1}
          value={Number(gravity.toFixed(2))}
          disabled={disabled}
          onChange={(g) => sim.call((m) => (g <= 0 ? m.disableGravity() : m.setGravity(g)))}
        />
        <SliderField
          label="Friction coefficient μ"
          min={0}
          max={1}
          step={0.01}
          value={Number(friction.toFixed(2))}
          disabled={disabled}
          onChange={(mu) => sim.call((m) => (mu <= 0 ? m.disableFriction() : m.setFriction(mu)))}
        />
        <SliderField
          label="Time step Δt"
          unit="s"
          min={0.005}
          max={0.1}
          step={0.005}
          value={Number((state?.timeStep ?? 0.05).toFixed(3))}
          disabled={disabled}
          onChange={(dt) => sim.call((m) => m.setTimeStep(dt))}
        />
        <SliderField
          label="Collision restitution e"
          min={0}
          max={1}
          step={0.01}
          value={Number((state?.restitution ?? 0.6).toFixed(2))}
          disabled={disabled}
          onChange={(e) => sim.call((m) => m.setRestitution(e))}
        />
        <SliderField
          label="Wall restitution"
          min={0}
          max={1}
          step={0.01}
          value={Number((state?.wallRestitution ?? 0.7).toFixed(2))}
          disabled={disabled}
          onChange={(e) => sim.call((m) => m.setWallRestitution(e))}
        />
        <p className="label-micro leading-relaxed">
          e = 1 bounces perfectly (kinetic energy kept); e = 0 removes the bounce. Friction opposes
          a body's velocity with a force μ·m·g. Gravity at 0 turns it off.
        </p>
      </div>
    </Panel>
  );
}
