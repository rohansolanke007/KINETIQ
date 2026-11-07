import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FreeBodyDiagram } from "@/components/fbd/FreeBodyDiagram";
import { InclineCanvas } from "@/components/incline/InclineCanvas";
import { InclineAnalysis, InclineEquations, InclineLive } from "@/components/incline/InclinePanels";
import { ChartDock } from "@/components/lab/ChartDock";
import { EnergyTab } from "@/components/lab/EnergyTab";
import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimLabLayout } from "@/components/lab/SimLabLayout";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport, ToggleChip } from "@/components/lab/SimTransport";
import type { InclineInfo, InclineState } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSimModule } from "@/lib/physics/useSimModule";
import { useModulePage } from "@/lib/useModulePage";

export const Route = createFileRoute("/lab_/incline")({
  head: () => ({
    meta: [
      { title: "Inclined Plane — KINETIQ" },
      {
        name: "description",
        content:
          "Normal force, friction and acceleration on an incline, with a live free-body diagram.",
      },
    ],
  }),
  component: InclinePage,
});

const phaseLabel = {
  static: "Held by friction",
  sliding: "Sliding",
  bottom: "Reached the bottom",
  top: "Reached the top",
} as const;

function InclinePage() {
  const host = useSim();
  const sim = useSimModule<InclineState, InclineInfo>(host, "incline");
  const [showForces, setShowForces] = useState(true);
  const [showComponents, setShowComponents] = useState(false);
  const ready = useModulePage(host, sim, {
    id: "incline-sim",
    label: "Inclined plane",
    href: "/lab/incline",
  });
  const finished = sim.state?.finished ?? false;
  const angle = sim.info?.parameters.find((p) => p.name === "angle")?.value ?? 0;
  const heat = sim.state?.energy.frictionHeat ?? 0;
  const work = sim.state?.energy.appliedWork ?? 0;

  return (
    <SimLabLayout
      title="Inclined plane"
      phase={!ready ? "Loading" : sim.state ? phaseLabel[sim.state.regime] : "Ready"}
      tone={sim.running && !finished ? "running" : finished ? "done" : "idle"}
      error={sim.error}
      left={
        <>
          <SimParameterPanel
            parameters={sim.info?.parameters}
            onChange={sim.setParameter}
            disabled={!ready}
            subtitle="Changing a value restarts the run"
          />
          <InclineEquations info={sim.info} />
        </>
      }
      canvas={
        <InclineCanvas
          info={sim.info}
          state={sim.state}
          forces={sim.forces}
          live={sim.live}
          showForces={showForces}
          showComponents={showComponents}
        />
      }
      transport={
        <SimTransport
          running={sim.running}
          finished={finished}
          disabled={!ready}
          speed={sim.speed}
          onSpeed={sim.setSpeed}
          onPlay={sim.play}
          onPause={sim.pause}
          onStep={sim.stepFrame}
          onReset={sim.reset}
          extra={
            <>
              <ToggleChip
                label="Force arrows"
                active={showForces}
                onClick={() => setShowForces((v) => !v)}
              />
              <ToggleChip
                label="Weight components"
                active={showComponents}
                onClick={() => setShowComponents((v) => !v)}
              />
            </>
          }
        />
      }
      below={
        <ChartDock
          tabs={[
            {
              id: "motion",
              label: "Motion",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="Distance along the slope s"
                    series={sim.series}
                    lines={[{ channel: "s", label: "s", color: "var(--cyan)" }]}
                  />
                  <SeriesChart
                    title="Velocity v (up slope +)"
                    series={sim.series}
                    lines={[{ channel: "v", label: "v", color: "var(--purple)" }]}
                  />
                </div>
              ),
            },
            {
              id: "energy",
              label: "Energy",
              content: (
                <EnergyTab
                  series={sim.series}
                  kinetic={sim.state?.energy.kinetic ?? 0}
                  potential={sim.state?.energy.potential ?? 0}
                  initial={sim.state?.energy.initial ?? 0}
                  heat={sim.state?.energy.frictionHeat ?? 0}
                  extraLines={[{ channel: "heat", label: "Heat", color: "var(--red)" }]}
                  banner={
                    heat > 1e-9 || Math.abs(work) > 1e-9
                      ? {
                          conserved: false,
                          headline: "Mechanical energy is not conserved here.",
                          detail: `Kinetic friction dissipated ${heat.toFixed(2)} J as heat${Math.abs(work) > 1e-9 ? ` and the applied force did ${work.toFixed(2)} J of work` : ""}, so KE + PE changed from ${(sim.state?.energy.initial ?? 0).toFixed(2)} J to ${(sim.state?.energy.mechanical ?? 0).toFixed(2)} J. Counting the heat and the work, the books balance to within ${Math.abs(sim.state?.energy.accountingError ?? 0).toExponential(1)} J: energy is conserved overall, just not as mechanical energy.`,
                        }
                      : {
                          conserved: true,
                          headline: "Mechanical energy is conserved so far.",
                          detail:
                            "No friction work or applied force has acted yet. Friction is a dissipative force: as soon as the block slides with friction, KE + PE falls by the heat produced.",
                        }
                  }
                />
              ),
            },
          ]}
        />
      }
      right={
        <>
          <InclineLive state={sim.state} />
          <FreeBodyDiagram
            data={sim.forces}
            shape="block"
            rotationDeg={angle}
            subtitle="Forces on the block"
            footnote="The weight is split into components along and into the slope (dashed)."
          />
          <InclineAnalysis info={sim.info} state={sim.state} />
        </>
      }
    />
  );
}
