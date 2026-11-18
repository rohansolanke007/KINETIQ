import { createFileRoute } from "@tanstack/react-router";

import { ChartDock } from "@/components/lab/ChartDock";
import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimLabLayout } from "@/components/lab/SimLabLayout";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport } from "@/components/lab/SimTransport";
import { RotationalDynamicsCanvas } from "@/components/rotational/RotationalDynamicsCanvas";
import {
  RotationalDynamicsEquations,
  RotationalDynamicsLive,
  RotationalDynamicsResults,
  RotationalDynamicsShapeSelect,
} from "@/components/rotational/RotationalDynamicsPanels";
import type { RotationalDynamicsInfo, RotationalDynamicsState } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSimModule } from "@/lib/physics/useSimModule";
import { useModulePage } from "@/lib/useModulePage";

export const Route = createFileRoute("/lab_/rotational")({
  head: () => ({
    meta: [
      { title: "Rotational Dynamics — KINETIQ" },
      {
        name: "description",
        content:
          "Rotate rigid bodies under applied torque: moment of inertia, angular acceleration, angular momentum and rotational kinetic energy — driven by the C++ physics engine.",
      },
    ],
  }),
  component: RotationalDynamicsPage,
});

function RotationalDynamicsPage() {
  const host = useSim();
  const sim = useSimModule<RotationalDynamicsState, RotationalDynamicsInfo>(host, "rotational");
  const ready = useModulePage(host, sim, {
    id: "rotational-sim",
    label: "Rotational dynamics",
    href: "/lab/rotational",
  });
  const started = (sim.state?.time ?? 0) > 0;
  const shapeId = sim.state?.shapeId ?? 0;

  return (
    <SimLabLayout
      title="Rotational dynamics"
      phase={!ready ? "Loading" : sim.running ? "Running" : started ? "Paused" : "Ready"}
      tone={sim.running ? "running" : "idle"}
      error={sim.error}
      left={
        <>
          <RotationalDynamicsShapeSelect
            value={shapeId}
            onChange={(id) => sim.setParameter("shape", id)}
            disabled={!ready}
          />
          <SimParameterPanel
            parameters={sim.info?.parameters.filter((p) => p.name !== "shape")}
            onChange={sim.setParameter}
            disabled={!ready}
            subtitle="Changing any value restarts the simulation"
          />
          <RotationalDynamicsEquations info={sim.info} />
        </>
      }
      canvas={
        <RotationalDynamicsCanvas
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
              id: "kinematics",
              label: "Kinematics",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="Angular velocity ω vs time"
                    series={sim.series}
                    lines={[{ channel: "omega", label: "ω (rad/s)", color: "var(--cyan)" }]}
                  />
                  <SeriesChart
                    title="Angular displacement θ vs time"
                    series={sim.series}
                    lines={[{ channel: "theta", label: "θ (rad)", color: "var(--amber)" }]}
                  />
                </div>
              ),
            },
            {
              id: "dynamics",
              label: "Dynamics",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="Angular acceleration α vs time"
                    series={sim.series}
                    lines={[{ channel: "alpha", label: "α (rad/s²)", color: "var(--purple)" }]}
                  />
                  <SeriesChart
                    title="Torque τ vs time"
                    series={sim.series}
                    lines={[{ channel: "torque", label: "τ (N·m)", color: "var(--green)" }]}
                  />
                </div>
              ),
            },
            {
              id: "energy",
              label: "Energy",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="Rotational KE vs time"
                    series={sim.series}
                    lines={[{ channel: "KE", label: "KE (J)", color: "var(--amber)" }]}
                  />
                  <SeriesChart
                    title="Angular momentum L vs time"
                    series={sim.series}
                    lines={[{ channel: "L", label: "L (kg·m²/s)", color: "var(--red)" }]}
                  />
                </div>
              ),
            },
          ]}
        />
      }
      right={
        <>
          <RotationalDynamicsLive state={sim.state} />
          <RotationalDynamicsResults info={sim.info} />
        </>
      }
    />
  );
}
