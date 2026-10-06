import { useEffect, useState } from "react";
import { Trash2, Zap } from "lucide-react";
import { ActionButton, Field, NumberInput, Panel, Readout } from "@/components/physics/ui";
import { fmt, shapeColor, speedOf } from "@/lib/physics/format";
import type { Simulation } from "@/lib/physics/useSimulation";

export function Inspector({
  sim,
  selectedId,
  onCleared,
}: {
  sim: Simulation;
  selectedId: number | null;
  onCleared: () => void;
}) {
  const object = sim.state?.objects.find((o) => o.id === selectedId) ?? null;
  const [px, setPx] = useState(0);
  const [py, setPy] = useState(0);
  const [vx, setVx] = useState(0);
  const [vy, setVy] = useState(0);
  const [ix, setIx] = useState(5);
  const [iy, setIy] = useState(0);

  useEffect(() => {
    if (!object) return;
    setPx(Number(object.pos.x.toFixed(2)));
    setPy(Number(object.pos.y.toFixed(2)));
    setVx(Number(object.vel.x.toFixed(2)));
    setVy(Number(object.vel.y.toFixed(2)));
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!object) {
    return (
      <Panel title="INSPECTOR" subtitle="Select a body on the board">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Click any body in the simulation board to inspect its live state, edit its position and
          velocity, or apply an impulse through the simulator.
        </p>
      </Panel>
    );
  }

  const color = shapeColor(object.shape);
  const momentum = object.mass * speedOf(object.vel);
  const energy = 0.5 * object.mass * speedOf(object.vel) ** 2;

  return (
    <Panel
      title={`BODY #${object.id}`}
      subtitle={`${object.shape} · ${object.isStatic ? "static" : "dynamic"} · ${fmt(object.mass)} kg`}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Readout label="SPEED" value={fmt(speedOf(object.vel))} unit="m/s" accent={color} />
          <Readout label="MOMENTUM" value={fmt(momentum)} unit="kg·m/s" />
          <Readout label="KINETIC ENERGY" value={fmt(energy)} unit="J" />
          <Readout label="ACCELERATION" value={fmt(speedOf(object.acc))} unit="m/s²" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="POS X">
            <NumberInput value={px} onChange={setPx} step={0.5} />
          </Field>
          <Field label="POS Y">
            <NumberInput value={py} onChange={setPy} step={0.5} />
          </Field>
        </div>
        <ActionButton
          className="w-full"
          onClick={() => sim.call((m) => m.setObjectPosition(object.id, px, py))}
        >
          SET POSITION
        </ActionButton>

        <div className="grid grid-cols-2 gap-2">
          <Field label="VEL X">
            <NumberInput value={vx} onChange={setVx} step={0.5} />
          </Field>
          <Field label="VEL Y">
            <NumberInput value={vy} onChange={setVy} step={0.5} />
          </Field>
        </div>
        <ActionButton
          className="w-full"
          onClick={() => sim.call((m) => m.setObjectVelocity(object.id, vx, vy))}
        >
          SET VELOCITY
        </ActionButton>

        <div className="grid grid-cols-2 gap-2">
          <Field label="IMPULSE X">
            <NumberInput value={ix} onChange={setIx} step={1} />
          </Field>
          <Field label="IMPULSE Y">
            <NumberInput value={iy} onChange={setIy} step={1} />
          </Field>
        </div>
        <ActionButton
          tone="primary"
          className="w-full"
          onClick={() => sim.call((m) => m.applyImpulse(object.id, ix, iy))}
        >
          <Zap className="size-3.5" /> APPLY IMPULSE
        </ActionButton>

        <ActionButton
          tone="danger"
          className="w-full"
          onClick={() => {
            sim.call((m) => m.removeObject(object.id));
            onCleared();
          }}
        >
          <Trash2 className="size-3.5" /> REMOVE BODY
        </ActionButton>
      </div>
    </Panel>
  );
}
