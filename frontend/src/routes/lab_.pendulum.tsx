import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FreeBodyDiagram } from "@/components/fbd/FreeBodyDiagram";
import { ChartDock } from "@/components/lab/ChartDock";
import { EnergyTab } from "@/components/lab/EnergyTab";
import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimLabLayout } from "@/components/lab/SimLabLayout";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport, ToggleChip } from "@/components/lab/SimTransport";
import { PendulumCanvas } from "@/components/oscillators/PendulumCanvas";
import {
  PendulumEquations,
  PendulumLive,
  PendulumResults,
} from "@/components/oscillators/PendulumPanels";
import type { PendulumInfo, PendulumState } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSimModule } from "@/lib/physics/useSimModule";
import { useModulePage } from "@/lib/useModulePage";

export const Route = createFileRoute("/lab_/pendulum")({
  head: () => ({
    meta: [
      { title: "Pendulum — KINETIQ" },
      {
        name: "description",
        content:
          "A nonlinear pendulum integrated with RK4: watch the period change with amplitude.",
      },
    ],
  }),
  component: PendulumPage,
});

function PendulumPage() {
  const host = useSim();
  const sim = useSimModule<PendulumState, PendulumInfo>(host, "pendulum");
  const [velocity, setVelocity] = useState(true);
  const ready = useModulePage(host, sim, {
    id: "pendulum-sim",
    label: "Pendulum",
    href: "/lab/pendulum",
  });
  const started = (sim.state?.time ?? 0) > 0;

  return (
    <SimLabLayout
      title="Pendulum"
      phase={!ready ? "Loading" : sim.running ? "Swinging" : started ? "Paused" : "Ready"}
      tone={sim.running ? "running" : "idle"}
      error={sim.error}
      left={
        <>
          <SimParameterPanel
            parameters={sim.info?.parameters}
            onChange={sim.setParameter}
            disabled={!ready}
            subtitle="Changing a value restarts the swing"
          />
          <PendulumEquations info={sim.info} />
        </>
      }
      canvas={
        <PendulumCanvas info={sim.info} state={sim.state} live={sim.live} showVelocity={velocity} />
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
            <ToggleChip
              label="Velocity vector"
              active={velocity}
              onClick={() => setVelocity((v) => !v)}
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
                    title="Angular displacement θ"
                    series={sim.series}
                    lines={[{ channel: "theta", label: "θ", color: "var(--cyan)" }]}
                  />
                  <SeriesChart
                    title="Angular velocity ω"
                    series={sim.series}
                    lines={[{ channel: "omega", label: "ω", color: "var(--purple)" }]}
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
                    detail: `KE + PE stays at ${(sim.state?.energy.total ?? 0).toFixed(3)} J (drift ${((sim.state?.energy.drift ?? 0) * 100).toFixed(5)}%). Gravity is a conservative force, the rod's tension does no work, and there is no friction or air drag. With a dissipative force the total would fall.`,
                  }}
                />
              ),
            },
          ]}
        />
      }
      right={
        <>
          <PendulumLive state={sim.state} />
          <FreeBodyDiagram
            data={sim.forces}
            shape="circle"
            subtitle="Forces on the bob"
            footnote="The tension minus the radial part of the weight supplies the centripetal force; the tangential part of the weight is the restoring force."
          />
          <PendulumResults info={sim.info} state={sim.state} />
        </>
      }
    />
  );
}
