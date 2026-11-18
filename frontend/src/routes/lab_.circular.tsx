import { createFileRoute } from "@tanstack/react-router";

import { ChartDock } from "@/components/lab/ChartDock";
import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimLabLayout } from "@/components/lab/SimLabLayout";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport } from "@/components/lab/SimTransport";
import { CircularMotionCanvas } from "@/components/circular/CircularMotionCanvas";
import {
  CircularMotionEquations,
  CircularMotionLive,
  CircularMotionResults,
} from "@/components/circular/CircularMotionPanels";
import type { CircularMotionInfo, CircularMotionState } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSimModule } from "@/lib/physics/useSimModule";
import { useModulePage } from "@/lib/useModulePage";

export const Route = createFileRoute("/lab_/circular")({
  head: () => ({
    meta: [
      { title: "Circular Motion — KINETIQ" },
      {
        name: "description",
        content:
          "Interactive circular motion simulation: angular velocity, centripetal force, tangential velocity and angular acceleration — driven by the C++ physics engine.",
      },
    ],
  }),
  component: CircularMotionPage,
});

function CircularMotionPage() {
  const host = useSim();
  const sim = useSimModule<CircularMotionState, CircularMotionInfo>(host, "circular");
  const ready = useModulePage(host, sim, {
    id: "circular-sim",
    label: "Circular motion",
    href: "/lab/circular",
  });
  const started = (sim.state?.time ?? 0) > 0;

  return (
    <SimLabLayout
      title="Circular motion"
      phase={!ready ? "Loading" : sim.running ? "Running" : started ? "Paused" : "Ready"}
      tone={sim.running ? "running" : "idle"}
      error={sim.error}
      left={
        <>
          <SimParameterPanel
            parameters={sim.info?.parameters}
            onChange={sim.setParameter}
            disabled={!ready}
            subtitle="Changing a value restarts the simulation"
          />
          <CircularMotionEquations info={sim.info} />
        </>
      }
      canvas={
        <CircularMotionCanvas
          info={sim.info}
          state={sim.state}
          live={sim.live}
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
        />
      }
      below={
        <ChartDock
          tabs={[
            {
              id: "angular",
              label: "Angular",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="Angular displacement θ vs time"
                    series={sim.series}
                    lines={[{ channel: "theta", label: "θ (rad)", color: "var(--amber)" }]}
                  />
                  <SeriesChart
                    title="Angular velocity ω vs time"
                    series={sim.series}
                    lines={[{ channel: "omega", label: "ω (rad/s)", color: "var(--cyan)" }]}
                  />
                </div>
              ),
            },
            {
              id: "linear",
              label: "Linear",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="Tangential velocity v vs time"
                    series={sim.series}
                    lines={[{ channel: "v", label: "v (m/s)", color: "var(--purple)" }]}
                  />
                  <SeriesChart
                    title="Centripetal acceleration aₒ vs time"
                    series={sim.series}
                    lines={[{ channel: "ac", label: "aₒ (m/s²)", color: "var(--green)" }]}
                  />
                </div>
              ),
            },
            {
              id: "force",
              label: "Force",
              content: (
                <SeriesChart
                  title="Centripetal force Fc vs time"
                  series={sim.series}
                  lines={[{ channel: "Fc", label: "Fc (N)", color: "var(--red)" }]}
                />
              ),
            },
          ]}
        />
      }
      right={
        <>
          <CircularMotionLive state={sim.state} />
          <CircularMotionResults info={sim.info} state={sim.state} />
        </>
      }
    />
  );
}
