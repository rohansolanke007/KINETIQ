import { Panel } from "@/components/physics/ui";
import { fmt, shapeColor, speedOf } from "@/lib/physics/format";
import type { PhysicsState } from "@/lib/physics/engine";
import { cn } from "@/lib/utils";

export function BodyList({
  state,
  selectedId,
  onSelect,
}: {
  state: PhysicsState | null;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const objects = state?.objects ?? [];
  return (
    <Panel
      title="Bodies"
      subtitle={`${objects.length} ${objects.length === 1 ? "body" : "bodies"} in the simulation`}
    >
      {objects.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          The world is empty. Add an object to begin.
        </p>
      ) : (
        <div className="space-y-1.5">
          {objects.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-all",
                o.id === selectedId
                  ? "border-primary/50 bg-primary/10"
                  : "border-border bg-background/40 hover:bg-accent",
              )}
            >
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: o.isStatic ? "var(--muted-foreground)" : shapeColor(o.shape),
                }}
              />
              <span className="tech text-[13px]">#{o.id}</span>
              <span className="label-micro flex-1 truncate">{o.shape}</span>
              <span className="tech text-[12px] text-muted-foreground">
                {fmt(speedOf(o.vel))} m/s
              </span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function CollisionPanel({ state }: { state: PhysicsState | null }) {
  const collisions = state?.recentCollisions ?? [];
  return (
    <Panel title="Contacts" subtitle={`${state?.stats.collisions ?? 0} collisions detected`}>
      {collisions.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No contacts in the latest simulation step.
        </p>
      ) : (
        <div className="space-y-1.5">
          {collisions.map((c, i) => (
            <div
              key={`${c.a}-${c.b}-${i}`}
              className="flex items-center justify-between rounded-md border border-red/30 bg-red/5 px-2.5 py-1.5"
            >
              <span className="tech text-[13px]">
                #{c.a} ↔ #{c.b}
              </span>
              <span className="label-micro">overlap {fmt(c.penetration, 3)} m</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
