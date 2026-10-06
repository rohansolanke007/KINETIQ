import { useState } from "react";
import { Plus } from "lucide-react";
import { ActionButton, Field, NumberInput, Panel, SegmentedControl } from "@/components/physics/ui";
import type { Simulation } from "@/lib/physics/useSimulation";

type Shape = "circle" | "rectangle" | "triangle";

export function CreatePanel({ sim }: { sim: Simulation }) {
  const [shape, setShape] = useState<Shape>("circle");
  const [isStatic, setIsStatic] = useState(false);
  const [mass, setMass] = useState(2);
  const [x, setX] = useState(50);
  const [y, setY] = useState(45);
  const [vx, setVx] = useState(0);
  const [vy, setVy] = useState(0);
  const [radius, setRadius] = useState(3);
  const [width, setWidth] = useState(6);
  const [height, setHeight] = useState(4);
  const [base, setBase] = useState(6);

  const create = () => {
    sim.call((m) => {
      if (shape === "circle") m.createCircle(isStatic, mass, x, y, radius, vx, vy);
      else if (shape === "rectangle") m.createRectangle(isStatic, mass, x, y, width, height, vx, vy);
      else m.createTriangle(isStatic, mass, x, y, base, height, vx, vy);
    });
  };

  return (
    <Panel title="CREATE BODY" subtitle="Create and configure simulation bodies">
      <div className="space-y-3">
        <SegmentedControl
          value={shape}
          onChange={setShape}
          options={[
            { label: "CIRCLE", value: "circle" },
            { label: "RECT", value: "rectangle" },
            { label: "TRI", value: "triangle" },
          ]}
        />
        <SegmentedControl
          size="sm"
          value={isStatic ? "static" : "dynamic"}
          onChange={(v) => setIsStatic(v === "static")}
          options={[
            { label: "DYNAMIC", value: "dynamic" },
            { label: "STATIC", value: "static" },
          ]}
        />

        <div className="grid grid-cols-2 gap-2">
          <Field label="MASS" suffix="kg">
            <NumberInput value={mass} onChange={setMass} step={0.5} min={0.1} />
          </Field>
          {shape === "circle" && (
            <Field label="RADIUS" suffix="m">
              <NumberInput value={radius} onChange={setRadius} step={0.5} min={0.1} />
            </Field>
          )}
          {shape === "rectangle" && (
            <Field label="WIDTH" suffix="m">
              <NumberInput value={width} onChange={setWidth} step={0.5} min={0.1} />
            </Field>
          )}
          {shape === "triangle" && (
            <Field label="BASE" suffix="m">
              <NumberInput value={base} onChange={setBase} step={0.5} min={0.1} />
            </Field>
          )}
          {shape !== "circle" && (
            <Field label="HEIGHT" suffix="m">
              <NumberInput value={height} onChange={setHeight} step={0.5} min={0.1} />
            </Field>
          )}
          <Field label="POSITION X" suffix="m">
            <NumberInput value={x} onChange={setX} step={1} />
          </Field>
          <Field label="POSITION Y" suffix="m">
            <NumberInput value={y} onChange={setY} step={1} />
          </Field>
          <Field label="VELOCITY X" suffix="m/s">
            <NumberInput value={vx} onChange={setVx} step={1} />
          </Field>
          <Field label="VELOCITY Y" suffix="m/s">
            <NumberInput value={vy} onChange={setVy} step={1} />
          </Field>
        </div>

        <ActionButton tone="primary" className="w-full" onClick={create} disabled={sim.status !== "ready"}>
          <Plus className="size-3.5" /> ADD TO WORLD
        </ActionButton>
      </div>
    </Panel>
  );
}
