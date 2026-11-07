import type { PhysicsState } from "@/lib/physics/engine";
import type { EngineStatus } from "@/lib/physics/useSimulation";
import { fmt } from "@/lib/physics/format";
import { cn } from "@/lib/utils";

const metrics = (state: PhysicsState | null) => [
  { label: "Time", value: `${fmt(state?.time ?? 0, 2)} s` },
  { label: "Time step", value: `${fmt(state?.timeStep ?? 0.05, 3)} s` },
  { label: "Bodies", value: String(state?.stats.objects ?? 0) },
  { label: "Kinetic energy", value: `${fmt(state?.stats.kineticEnergy ?? 0, 2)} J` },
  { label: "Collisions", value: String(state?.stats.collisions ?? 0) },
];

export function TelemetryBar({
  state,
  status,
}: {
  state: PhysicsState | null;
  status: EngineStatus;
}) {
  const online = status === "ready";
  const paused = state?.paused ?? true;
  return (
    <div className="glass flex flex-wrap items-center gap-x-1 gap-y-2 rounded-lg px-4 py-2.5">
      <div className="flex items-center gap-2 pr-4">
        <span
          className={cn(
            "size-2 rounded-full",
            online
              ? paused
                ? "bg-amber"
                : "status-dot bg-green"
              : status === "error"
                ? "bg-red"
                : "bg-amber",
          )}
        />
        <span className="text-[13px] font-medium">
          {online
            ? paused
              ? "Paused"
              : "Running"
            : status === "error"
              ? "Engine offline"
              : "Loading WebAssembly…"}
        </span>
      </div>
      <div className="flex flex-1 flex-wrap">
        {metrics(state).map((metric) => (
          <div key={metric.label} className="min-w-[96px] border-l border-border px-4 py-0.5">
            <div className="label-micro">{metric.label}</div>
            <div className="tech mt-0.5 text-[13.5px] font-medium">{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
