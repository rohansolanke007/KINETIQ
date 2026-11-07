import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FreeBodyDiagram } from "@/components/fbd/FreeBodyDiagram";
import { ChartDock } from "@/components/lab/ChartDock";
import { EnergyTab } from "@/components/lab/EnergyTab";
import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimLabLayout } from "@/components/lab/SimLabLayout";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport, ToggleChip } from "@/components/lab/SimTransport";
import { ShmEquations, ShmLive, ShmResults } from "@/components/oscillators/ShmPanels";
import { SpringCanvas } from "@/components/oscillators/SpringCanvas";
import type { ShmInfo, ShmState } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSimModule } from "@/lib/physics/useSimModule";
import { useModulePage } from "@/lib/useModulePage";

export const Route = createFileRoute("/lab_/shm")({
  head: () => ({
    meta: [
      { title: "Simple Harmonic Motion — KINETIQ" },
      {
        name: "description",
        content:
          "A mass on a spring: vary mass, stiffness and displacement and watch F = −kx at work.",
      },
    ],
  }),
  component: ShmPage,
});

function ShmPage() {
  const host = useSim();
  const sim = useSimModule<ShmState, ShmInfo>(host, "shm");
  const [force, setForce] = useState(true);
  const ready = useModulePage(host, sim, {
    id: "shm-sim",
    label: "Simple harmonic motion",
    href: "/lab/shm",
  });
  const started = (sim.state?.time ?? 0) > 0;

  return (
    <SimLabLayout
      title="Simple harmonic motion"
      phase={!ready ? "Loading" : sim.running ? "Oscillating" : started ? "Paused" : "Ready"}
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
          <ShmEquations info={sim.info} />
        </>
      }
      canvas={<SpringCanvas info={sim.info} state={sim.state} live={sim.live} showForce={force} />}
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
            <ToggleChip
              label="Restoring force"
              active={force}
              onClick={() => setForce((v) => !v)}
            />
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
                    lines={[{ channel: "x", label: "x", color: "var(--cyan)" }]}
                  />
                  <SeriesChart
                    title="Velocity v"
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
                  banner={{
                    conserved: true,
                    headline: "Mechanical energy is conserved.",
                    detail: `Energy swaps between kinetic and spring energy while the total stays at ${(sim.state?.energy.total ?? 0).toFixed(3)} J (drift ${((sim.state?.energy.drift ?? 0) * 100).toFixed(4)}%). The spring force is conservative and nothing damps the motion; add friction and the oscillation would die away.`,
                  }}
                />
              ),
            },
          ]}
        />
      }
      right={
        <>
          <ShmLive state={sim.state} />
          <FreeBodyDiagram
            data={sim.forces}
            shape="block"
            subtitle="Forces on the block"
            footnote="Weight and the normal reaction cancel, so the spring force is the whole resultant."
          />
          <ShmResults info={sim.info} state={sim.state} />
        </>
      }
    />
  );
}
