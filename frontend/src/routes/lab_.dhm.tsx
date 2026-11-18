import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FreeBodyDiagram } from "@/components/fbd/FreeBodyDiagram";
import { ChartDock } from "@/components/lab/ChartDock";
import { EnergyTab } from "@/components/lab/EnergyTab";
import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimLabLayout } from "@/components/lab/SimLabLayout";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport, ToggleChip } from "@/components/lab/SimTransport";
import { DhmCanvas } from "@/components/oscillators/DhmCanvas";
import {
  DhmEducation,
  DhmEquations,
  DhmLive,
  DhmResults,
} from "@/components/oscillators/DhmPanels";
import type { DhmInfo, DhmState } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSimModule } from "@/lib/physics/useSimModule";
import { useModulePage } from "@/lib/useModulePage";

export const Route = createFileRoute("/lab_/dhm")({
  head: () => ({
    meta: [
      { title: "Damped Harmonic Motion — KINETIQ" },
      {
        name: "description",
        content:
          "Explore underdamped, critically damped, and overdamped oscillations with a live spring-mass-damper simulation.",
      },
    ],
  }),
  component: DhmPage,
});

function DhmPage() {
  const host = useSim();
  const sim = useSimModule<DhmState, DhmInfo>(host, "dhm");
  const [showDamper, setShowDamper] = useState(true);
  const [showForces, setShowForces] = useState(true);

  const ready = useModulePage(host, sim, {
    id: "dhm-sim",
    label: "Damped harmonic motion",
    href: "/lab/dhm",
  });

  const started = (sim.state?.time ?? 0) > 0;
  const regime = sim.state?.regime ?? sim.info?.analytic.regime;
  const phaseLabel =
    !ready
      ? "Loading"
      : sim.running
      ? regime === "underdamped"
        ? "Oscillating (underdamped)"
        : regime === "critical"
        ? "Returning (critically damped)"
        : "Returning (overdamped)"
      : started
      ? "Paused"
      : "Ready";

  return (
    <SimLabLayout
      title="Damped harmonic motion"
      phase={phaseLabel}
      tone={sim.running ? "running" : "idle"}
      error={sim.error}
      left={
        <>
          <SimParameterPanel
            parameters={sim.info?.parameters}
            onChange={sim.setParameter}
            disabled={!ready}
            subtitle="Changing a value restarts the motion"
          />
          <DhmEquations info={sim.info} />
          <DhmEducation />
        </>
      }
      canvas={
        <DhmCanvas
          info={sim.info}
          state={sim.state}
          live={sim.live}
          showDamper={showDamper}
          showForces={showForces}
        />
      }
      transport={
        <SimTransport
          running={sim.running}
          finished={false}
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
                label="Damper"
                active={showDamper}
                onClick={() => setShowDamper((v) => !v)}
              />
              <ToggleChip
                label="Forces"
                active={showForces}
                onClick={() => setShowForces((v) => !v)}
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
                    title="Displacement x"
                    series={sim.series}
                    lines={[{ channel: "x", label: "x (m)", color: "var(--cyan)" }]}
                  />
                  <SeriesChart
                    title="Velocity v"
                    series={sim.series}
                    lines={[{ channel: "v", label: "v (m/s)", color: "var(--purple)" }]}
                  />
                  <SeriesChart
                    title="Acceleration a"
                    series={sim.series}
                    lines={[{ channel: "a", label: "a (m/s²)", color: "var(--blue)" }]}
                  />
                  <SeriesChart
                    title="Forces"
                    series={sim.series}
                    lines={[
                      { channel: "Fspring", label: "F_spring", color: "var(--green)" },
                      { channel: "Fdamp",   label: "F_damp",   color: "var(--red)" },
                      { channel: "Fnet",    label: "F_net",    color: "var(--amber)" },
                    ]}
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
                  banner={{
                    conserved: false,
                    headline: "Mechanical energy is dissipated by the damper.",
                    detail: `The damper converts mechanical energy to heat. Total energy has changed from ${(sim.state?.energy.initial ?? 0).toFixed(3)} J to ${(sim.state?.energy.total ?? 0).toFixed(3)} J (${((sim.state?.energy.drift ?? 0) * 100).toFixed(2)}% change). With c = 0 energy would be conserved.`,
                  }}
                />
              ),
            },
          ]}
        />
      }
      right={
        <>
          <DhmLive state={sim.state} />
          <FreeBodyDiagram
            data={sim.forces}
            shape="block"
            subtitle="Forces on the block"
            footnote="Spring force and damping force together give the net force. Weight and normal cancel on the horizontal surface."
          />
          <DhmResults info={sim.info} state={sim.state} />
        </>
      }
    />
  );
}
