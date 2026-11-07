import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Trash2, Zap } from "lucide-react";
import { ActionButton, Field, NumberInput, Panel } from "@/components/physics/ui";
import { fmt, shapeColor, speedOf } from "@/lib/physics/format";
import { bodyEnergy, netForce } from "@/lib/physics/derived";
import type { Simulation } from "@/lib/physics/useSimulation";
import { cn } from "@/lib/utils";

function Row({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string | undefined;
  accent?: string | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="tech text-[13.5px] font-medium" style={accent ? { color: accent } : undefined}>
        {value}
        {unit && (
          <span className="ml-1 text-[11.5px] font-normal text-muted-foreground">{unit}</span>
        )}
      </dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-0.5 text-[12px] font-semibold text-foreground/90">{title}</h3>
      <dl className="divide-y divide-border">{children}</dl>
    </section>
  );
}

export function Inspector({
  sim,
  selectedId,
  onCleared,
}: {
  sim: Simulation;
  selectedId: number | null;
  onCleared: () => void;
}) {
  const state = sim.state;
  const object = state?.objects.find((o) => o.id === selectedId) ?? null;
  const [px, setPx] = useState(0);
  const [py, setPy] = useState(0);
  const [vx, setVx] = useState(0);
  const [vy, setVy] = useState(0);
  const [ix, setIx] = useState(5);
  const [iy, setIy] = useState(0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!object) return;
    setPx(Number(object.pos.x.toFixed(2)));
    setPy(Number(object.pos.y.toFixed(2)));
    setVx(Number(object.vel.x.toFixed(2)));
    setVy(Number(object.vel.y.toFixed(2)));
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!object || !state) {
    return (
      <Panel title="Physics inspector" subtitle="Nothing selected">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Select a body on the canvas or in the list below to read its live mass, position,
          velocity, forces and energy from the C++ engine.
        </p>
      </Panel>
    );
  }

  const color = shapeColor(object.shape);
  const energy = bodyEnergy(object, state);
  const force = netForce(object);
  const weight = state.gravityEnabled && !object.isStatic ? object.mass * state.gravity : 0;
  // everything except gravity: friction, contacts and applied forces
  const otherX = force.x;
  const otherY = force.y + weight;

  return (
    <Panel
      title={`${object.shape} #${object.id}`}
      subtitle={object.isStatic ? "Static body" : "Dynamic body"}
      actions={
        <span
          className="mt-1 size-2.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      }
    >
      <div className="space-y-4">
        <Group title="Kinematics">
          <Row
            label="Mass"
            value={object.isStatic ? "Fixed" : fmt(object.mass)}
            unit={object.isStatic ? undefined : "kg"}
          />
          <Row label="Position x" value={fmt(object.pos.x)} unit="m" />
          <Row label="Position y" value={fmt(object.pos.y)} unit="m" />
          <Row label="Velocity x" value={fmt(object.vel.x)} unit="m/s" />
          <Row label="Velocity y" value={fmt(object.vel.y)} unit="m/s" />
          <Row label="Speed" value={fmt(speedOf(object.vel))} unit="m/s" accent={color} />
          <Row label="Acceleration" value={fmt(speedOf(object.acc))} unit="m/s²" />
        </Group>

        <Group title="Forces">
          <Row label="Gravity (m·g)" value={fmt(weight)} unit="N" />
          <Row
            label="Friction, contact, applied"
            value={fmt(object.isStatic ? 0 : Math.hypot(otherX, otherY))}
            unit="N"
          />
          <Row
            label="Net force (m·a)"
            value={fmt(Math.hypot(force.x, force.y))}
            unit="N"
            accent="var(--amber)"
          />
        </Group>

        <Group title="Energy">
          <Row label="Kinetic" value={fmt(energy.kinetic)} unit="J" />
          <Row label="Potential (above y = 0)" value={fmt(energy.potential)} unit="J" />
          <Row label="Mechanical" value={fmt(energy.mechanical)} unit="J" />
        </Group>

        <div className="rounded-md border border-border">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
            className="flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium"
          >
            Edit body
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                editing && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          {editing && (
            <div className="space-y-3 border-t border-border p-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Position x" suffix="m">
                  <NumberInput value={px} onChange={setPx} step={0.5} />
                </Field>
                <Field label="Position y" suffix="m">
                  <NumberInput value={py} onChange={setPy} step={0.5} />
                </Field>
              </div>
              <ActionButton
                className="w-full"
                onClick={() =>
                  Number.isFinite(px) &&
                  Number.isFinite(py) &&
                  sim.call((m) => m.setObjectPosition(object.id, px, py))
                }
              >
                Set position
              </ActionButton>

              {!object.isStatic && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Velocity x" suffix="m/s">
                      <NumberInput value={vx} onChange={setVx} step={0.5} />
                    </Field>
                    <Field label="Velocity y" suffix="m/s">
                      <NumberInput value={vy} onChange={setVy} step={0.5} />
                    </Field>
                  </div>
                  <ActionButton
                    className="w-full"
                    onClick={() =>
                      Number.isFinite(vx) &&
                      Number.isFinite(vy) &&
                      sim.call((m) => m.setObjectVelocity(object.id, vx, vy))
                    }
                  >
                    Set velocity
                  </ActionButton>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Force x" suffix="N">
                      <NumberInput value={ix} onChange={setIx} step={1} />
                    </Field>
                    <Field label="Force y" suffix="N">
                      <NumberInput value={iy} onChange={setIy} step={1} />
                    </Field>
                  </div>
                  <ActionButton
                    tone="primary"
                    className="w-full"
                    onClick={() =>
                      Number.isFinite(ix) &&
                      Number.isFinite(iy) &&
                      sim.call((m) => m.applyImpulse(object.id, ix, iy))
                    }
                  >
                    <Zap className="size-3.5" aria-hidden /> Apply force
                  </ActionButton>
                </>
              )}

              <ActionButton
                tone="danger"
                className="w-full"
                onClick={() => {
                  sim.call((m) => m.removeObject(object.id));
                  onCleared();
                }}
              >
                <Trash2 className="size-3.5" aria-hidden /> Remove body
              </ActionButton>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
