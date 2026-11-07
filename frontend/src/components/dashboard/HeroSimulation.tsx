import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, RotateCw } from "lucide-react";
import { WorldCanvas } from "@/components/physics/WorldCanvas";
import { useSim } from "@/lib/physics/SimulationContext";
import { fmt } from "@/lib/physics/format";
import { cn } from "@/lib/utils";

/**
 * A live view of the real C++ engine. Three projectiles are launched by
 * the WebAssembly world; nothing here is animated in JavaScript.
 */
export function HeroSimulation() {
  const sim = useSim();
  const { status, startDemo, releaseDemo, ownerRef } = sim;
  const bodies = sim.state?.objects.length ?? 0;
  const showingWorkspace = ownerRef.current === "user" && bodies > 0;

  useEffect(() => {
    if (status !== "ready") return;
    const hasUserWorld =
      ownerRef.current === "user" && (sim.live.stateRef.current?.objects.length ?? 0) > 0;
    if (!hasUserWorld) startDemo();
    return releaseDemo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <figure className="glass overflow-hidden rounded-lg">
      <figcaption className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <span
            className={cn(
              "size-2 rounded-full",
              status === "ready"
                ? "status-dot bg-green"
                : status === "error"
                  ? "bg-red"
                  : "bg-amber",
            )}
            aria-hidden
          />
          {status === "error"
            ? "Engine offline"
            : showingWorkspace
              ? "Your current workspace"
              : "Live C++ simulation"}
        </span>
        <span className="tech text-[12.5px] text-muted-foreground">
          t = {fmt(sim.state?.time ?? 0, 2)} s
        </span>
      </figcaption>

      <div className="relative h-[300px] sm:h-[340px]">
        <WorldCanvas
          state={sim.state}
          live={sim.live}
          selectedId={null}
          compact
          interactive={false}
          showVectors={false}
          showTrails
          showGrid
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-[12.5px] text-muted-foreground">
        <span>
          {showingWorkspace
            ? `${bodies} ${bodies === 1 ? "body" : "bodies"} from the Lab, stepped by the C++ engine.`
            : "Launch angles 62°, 42° and 18° under g = 9.8 m/s²."}
        </span>
        <span className="flex items-center gap-3">
          {showingWorkspace && (
            <button
              type="button"
              onClick={startDemo}
              className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
            >
              <RotateCw className="size-3.5" aria-hidden /> Replay demo
            </button>
          )}
          <Link
            to="/lab"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Continue in the Lab <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </span>
      </div>
    </figure>
  );
}
