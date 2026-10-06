import type { PhysicsState } from "@/lib/physics/engine";
import type { EngineStatus } from "@/lib/physics/useSimulation";
import { fmt } from "@/lib/physics/format";
import { cn } from "@/lib/utils";

const metrics = (state: PhysicsState | null) => [
  { label: "TIME", value: `${fmt(state?.time ?? 0, 2)} s` },
  { label: "Δt", value: `${fmt(state?.timeStep ?? 0.05, 3)} s` },
  { label: "BODIES", value: String(state?.stats.objects ?? 0) },
  { label: "KINETIC ENERGY", value: `${fmt(state?.stats.kineticEnergy ?? 0, 2)} J` },
  { label: "COLLISIONS", value: String(state?.stats.collisions ?? 0) },
];

export function TelemetryBar({
  state,
  status,
}: {
  state: PhysicsState | null;
  status: EngineStatus;
}) {
  const online = status === "ready";
  return (
    <div className="glass flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl px-3.5 py-2.5">
      <div className="flex items-center gap-2 pr-3">
        <span
          className={cn(
            "size-2 rounded-full",
            online ? "status-dot bg-green" : status === "error" ? "bg-red" : "bg-amber",
          )}
        />
        <span className="tech text-[10px] tracking-[0.16em]">
          {online
            ? "KINETIQ ONLINE"
            : status === "error"
              ? "ENGINE OFFLINE"
              : "LOADING WEBASSEMBLY…"}
        </span>
      </div>
      <div className="flex flex-1 flex-wrap">
        {metrics(state).map((metric) => (
          <div key={metric.label} className="min-w-[92px] border-l border-border px-3 py-0.5">
            <div className="label-micro">{metric.label}</div>
            <div className="tech mt-0.5 text-[12px] font-medium">{metric.value}</div>
          </div>
        ))}
      </div>
      <div className="tech border-l border-border px-3 text-[10px] text-muted-foreground">
        {state?.paused ? "PAUSED" : "RUNNING"}
      </div>
    </div>
  );
}
