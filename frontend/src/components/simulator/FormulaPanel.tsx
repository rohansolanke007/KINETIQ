import { Panel } from "@/components/physics/ui";
import type { PhysicsState } from "@/lib/physics/engine";

export function FormulaPanel({
  state,
  selectedId,
}: {
  state: PhysicsState | null;
  selectedId: number | null;
}) {
  const dynamicObjects = (state?.objects ?? []).filter((o) => !o.isStatic);
  const body =
    selectedId !== null ? dynamicObjects.find((o) => o.id === selectedId) : dynamicObjects[0];

  if (!state || !body) {
    return (
      <Panel title="Live calculation" subtitle="Kinetic energy">
        <p className="text-[13px] text-muted-foreground">
          Add a dynamic body to see its calculation.
        </p>
      </Panel>
    );
  }

  const v = Math.hypot(body.vel.x, body.vel.y);
  const ke = 0.5 * body.mass * v * v;

  return (
    <Panel title="Live calculation" subtitle={`Kinetic energy of body #${body.id}`}>
      <div className="space-y-2 rounded-md border border-border bg-background/40 p-3 text-[13px]">
        <div className="tech text-muted-foreground">KE = ½ m v²</div>
        <div className="tech">
          = ½ × {body.mass.toFixed(2)} kg × ({v.toFixed(2)} m/s)²
        </div>
        <div className="tech text-[15px] font-semibold text-primary">= {ke.toFixed(2)} J</div>
      </div>
    </Panel>
  );
}
