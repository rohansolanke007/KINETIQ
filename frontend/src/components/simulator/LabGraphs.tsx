import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ChartDock } from "@/components/lab/ChartDock";
import { SeriesChart } from "@/components/lab/SeriesChart";
import type { SeriesData } from "@/lib/physics/useSimModule";
import type { Simulation } from "@/lib/physics/useSimulation";
import { cn } from "@/lib/utils";
import { VelocityGraph } from "./VelocityGraph";

/** Collapsible strip of live graphs under the canvas. Energy and momentum come from C++. */
export function LabGraphs({
  sim,
  analysisSeries,
}: {
  sim: Simulation;
  analysisSeries: SeriesData | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="glass flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left"
      >
        <span className="text-[13px] font-semibold">Live graphs</span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-3">
          <ChartDock
            tabs={[
              {
                id: "energy",
                label: "Energy",
                content: (
                  <SeriesChart
                    title="Kinetic, potential and mechanical energy"
                    series={analysisSeries}
                    lines={[
                      { channel: "ke", label: "Kinetic", color: "var(--cyan)" },
                      { channel: "pe", label: "Potential", color: "var(--purple)" },
                      { channel: "e", label: "Total", color: "var(--amber)" },
                    ]}
                    height={190}
                  />
                ),
              },
              {
                id: "momentum",
                label: "Momentum",
                content: (
                  <SeriesChart
                    title="Total momentum"
                    series={analysisSeries}
                    lines={[
                      { channel: "px", label: "px", color: "var(--blue)" },
                      { channel: "py", label: "py", color: "var(--purple)" },
                      { channel: "p", label: "|p|", color: "var(--amber)" },
                    ]}
                    height={190}
                  />
                ),
              },
              {
                id: "speed",
                label: "Speed",
                content: <VelocityGraph velocityHistory={sim.velocityHistory} />,
              },
            ]}
          />
        </div>
      )}
    </section>
  );
}
