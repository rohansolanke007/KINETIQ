import { useState } from "react";
import { Circle, Square, Triangle } from "lucide-react";
import { toast } from "sonner";
import { Field, NumberInput, Panel, SliderField } from "@/components/physics/ui";
import { Switch } from "@/components/ui/switch";
import type { Simulation } from "@/lib/physics/useSimulation";

type Shape = "circle" | "rectangle" | "triangle";

const shapes: { id: Shape; label: string; icon: typeof Circle }[] = [
  { id: "circle", label: "Circle", icon: Circle },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "triangle", label: "Triangle", icon: Triangle },
];

export function ObjectsPanel({
  sim,
  onCreated,
}: {
  sim: Simulation;
  onCreated: (id: number) => void;
}) {
  const [isStatic, setIsStatic] = useState(false);
  const [mass, setMass] = useState(2);
  const [vx, setVx] = useState(0);
  const [vy, setVy] = useState(0);
  const [size, setSize] = useState(2.5);
  const [x, setX] = useState(30);
  const [y, setY] = useState(40);

  const disabled = sim.status !== "ready";

  const add = (shape: Shape) => {
    if (!isStatic && !(mass > 0)) return void toast.error("Mass must be greater than zero.");
    if (!(size > 0)) return void toast.error("Size must be greater than zero.");
    if (![x, y, vx, vy].every(Number.isFinite))
      return void toast.error("Position and velocity must be numbers.");

    const id = sim.call((m) => {
      if (shape === "circle") return m.createCircle(isStatic, mass, x, y, size, vx, vy);
      if (shape === "rectangle")
        return m.createRectangle(isStatic, mass, x, y, size * 2, size * 1.3, vx, vy);
      return m.createTriangle(isStatic, mass, x, y, size * 2, size * 1.8, vx, vy);
    });
    if (typeof id === "number") {
      onCreated(id);
      // stagger the next spawn so bodies do not pile up
      setX((prev) => (prev + 12 > 90 ? 15 : prev + 12));
    }
  };

  return (
    <Panel title="Objects" subtitle="Configure, then add to the world">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {shapes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => add(id)}
              aria-label={`Add ${label.toLowerCase()}`}
              className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-2.5 text-[12px] font-medium transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-40"
            >
              <Icon className="size-[18px] text-primary" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3.5">
          <SliderField
            label="Mass"
            unit="kg"
            min={0.5}
            max={50}
            step={0.5}
            value={mass}
            onChange={setMass}
            disabled={isStatic}
          />
          <SliderField
            label="Size"
            unit="m"
            min={0.5}
            max={10}
            step={0.5}
            value={size}
            onChange={setSize}
          />
          <SliderField
            label="Initial velocity x"
            unit="m/s"
            min={-40}
            max={40}
            step={1}
            value={vx}
            onChange={setVx}
          />
          <SliderField
            label="Initial velocity y"
            unit="m/s"
            min={-40}
            max={40}
            step={1}
            value={vy}
            onChange={setVy}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Position x" suffix="m">
            <NumberInput value={x} onChange={setX} step={1} min={0} max={100} />
          </Field>
          <Field label="Position y" suffix="m">
            <NumberInput value={y} onChange={setY} step={1} min={0} max={60} />
          </Field>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
          <span>
            <span className="block text-[13px] font-medium">Static body</span>
            <span className="label-micro">Fixed in place, like a floor or wall</span>
          </span>
          <Switch checked={isStatic} onCheckedChange={setIsStatic} aria-label="Static body" />
        </label>
      </div>
    </Panel>
  );
}
