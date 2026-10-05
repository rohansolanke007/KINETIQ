import type { PhysicsState } from "@/lib/physics/engine";

export function FormulaPanel({
  state,
  selectedId,
}: {
  state: PhysicsState | null;
  selectedId: number | null;
}) {
  if (!state) {
    return (
      <div className="glass rounded-xl border border-border p-4">
        <div className="label-micro">FORMULA & CALCULATION</div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Start the physics engine to view live calculations.
        </p>
      </div>
    );
  }

  const dynamicObjects = state.objects.filter(
    (object) => !object.isStatic,
  );

  const selectedObject =
    selectedId !== null
      ? dynamicObjects.find((object) => object.id === selectedId)
      : dynamicObjects[0];

  if (!selectedObject) {
    return (
      <div className="glass rounded-xl border border-border p-4">
        <div className="label-micro">FORMULA & CALCULATION</div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Create a dynamic object to view its calculations.
        </p>
      </div>
    );
  }

  const mass = selectedObject.mass;

  const velocity = Math.hypot(
    selectedObject.vel.x,
    selectedObject.vel.y,
  );

  const kineticEnergy = 0.5 * mass * velocity * velocity;

  return (
    <div className="glass rounded-xl border border-border p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="label-micro">FORMULA & CALCULATION</div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Body #{selectedObject.id}
          </div>
        </div>

        <div className="tech text-[9px] text-muted-foreground">
          LIVE
        </div>
      </div>

      <div className="space-y-4">
        {/* Formula */}
        <div>
          <div className="mb-1 text-[9px] text-muted-foreground">
            KINETIC ENERGY
          </div>

          <div className="rounded-md border border-border bg-background/40 px-3 py-2">
            <div className="font-mono text-sm">
              KE = ½mv²
            </div>
          </div>
        </div>

        {/* Variables */}
        <div>
          <div className="mb-2 text-[9px] text-muted-foreground">
            VARIABLES
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border bg-background/30 p-2">
              <div className="text-[9px] text-muted-foreground">
                MASS (m)
              </div>
              <div className="mt-1 font-mono text-xs">
                {mass.toFixed(2)} kg
              </div>
            </div>

            <div className="rounded-md border border-border bg-background/30 p-2">
              <div className="text-[9px] text-muted-foreground">
                VELOCITY (v)
              </div>
              <div className="mt-1 font-mono text-xs">
                {velocity.toFixed(2)} m/s
              </div>
            </div>
          </div>
        </div>

        {/* Calculation */}
        <div>
          <div className="mb-2 text-[9px] text-muted-foreground">
            CALCULATION
          </div>

          <div className="rounded-md border border-border bg-background/30 p-3 font-mono text-[11px] leading-6">
            <div>
              KE = ½ × {mass.toFixed(2)} × ({velocity.toFixed(2)})²
            </div>

            <div className="font-semibold">
              = {kineticEnergy.toFixed(2)} J
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
