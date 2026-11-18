import { createFileRoute } from "@tanstack/react-router";

import { ChartDock } from "@/components/lab/ChartDock";
import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimLabLayout } from "@/components/lab/SimLabLayout";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport } from "@/components/lab/SimTransport";
import { DragCanvas } from "@/components/drag/DragCanvas";
import {
  DragEquations,
  DragLive,
  DragResults,
  DragModeSelect,
} from "@/components/drag/DragPanels";
import type { AirResistanceInfo, AirResistanceState } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSimModule } from "@/lib/physics/useSimModule";
import { useModulePage } from "@/lib/useModulePage";

export const Route = createFileRoute("/lab_/drag")({
  head: () => ({
    meta: [
      { title: "Air Resistance & Terminal Velocity — KINETIQ" },
      {
        name: "description",
        content:
          "Simulate linear and quadratic air drag, terminal velocity and free fall with resistance — driven by the C++ physics engine.",
      },
    ],
  }),
  component: DragPage,
});

function DragPage() {
  const host = useSim();
  const sim = useSimModule<AirResistanceState, AirResistanceInfo>(host, "drag");
  const ready = useModulePage(host, sim, {
    id: "drag-sim",
    label: "Air resistance",
    href: "/lab/drag",
  });
  const started = (sim.state?.time ?? 0) > 0;
  const dragMode = sim.state?.dragMode ?? sim.info?.analytic.dragMode ?? 2;

  return (
    <SimLabLayout
      title="Air resistance & terminal velocity"
      phase={!ready ? "Loading" : sim.running ? "Running" : started ? "Paused" : "Ready"}
      tone={sim.running ? "running" : "idle"}
      error={sim.error}
      left={
        <>
          <DragModeSelect
            value={dragMode}
            onChange={(m) => sim.setParameter("dragMode", m)}
            disabled={!ready}
          />
          <SimParameterPanel
            parameters={sim.info?.parameters.filter(
              (p) => !["dragMode"].includes(p.name),
            )}
            onChange={sim.setParameter}
            disabled={!ready}
            subtitle="Changing any value restarts the simulation"
          />
          <DragEquations info={sim.info} />
        </>
      }
      canvas={
        <DragCanvas
          info={sim.info}
          state={sim.state}
          live={sim.live}
        />
      }
      transport={
        <SimTransport
          running={sim.running}
          finished={sim.state?.finished ?? false}
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
              id: "velocity",
              label: "Velocity",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="Vertical velocity vy vs time"
                    series={sim.series}
                    lines={[{ channel: "vy", label: "vy (m/s)", color: "var(--cyan)" }]}
                  />
                  <SeriesChart
                    title="Vertical position y vs time"
                    series={sim.series}
                    lines={[{ channel: "y", label: "y (m)", color: "var(--amber)" }]}
                  />
                </div>
              ),
            },
            {
              id: "forces",
              label: "Forces",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="Drag force vs time"
                    series={sim.series}
                    lines={[{ channel: "Fd", label: "F_drag (N)", color: "var(--red)" }]}
                  />
                  <SeriesChart
                    title="Net force vs time"
                    series={sim.series}
                    lines={[{ channel: "Fn", label: "F_net (N)", color: "var(--green)" }]}
                  />
                </div>
              ),
            },
            {
              id: "acceleration",
              label: "Acceleration",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="Vertical acceleration ay vs time"
                    series={sim.series}
                    lines={[{ channel: "ay", label: "ay (m/s²)", color: "var(--purple)" }]}
                  />
                  <SeriesChart
                    title="Reynolds number Re vs time"
                    series={sim.series}
                    lines={[{ channel: "Re", label: "Re", color: "var(--blue)" }]}
                  />
                </div>
              ),
            },
          ]}
        />
      }
      right={
        <>
          <DragLive state={sim.state} />
          <DragResults info={sim.info} state={sim.state} />
        </>
      }
    />
  );
}
