import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ChartDock } from "@/components/lab/ChartDock";
import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimLabLayout } from "@/components/lab/SimLabLayout";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport } from "@/components/lab/SimTransport";
import { SegmentedControl } from "@/components/physics/ui";
import { OrbitalCanvas } from "@/components/orbital/OrbitalCanvas";
import {
  OrbitalEquations,
  OrbitalLive,
  OrbitalResults,
  OrbitalBodySelect,
} from "@/components/orbital/OrbitalPanels";
import type { OrbitalMechanicsInfo, OrbitalMechanicsState } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSimModule } from "@/lib/physics/useSimModule";
import { useModulePage } from "@/lib/useModulePage";

export const Route = createFileRoute("/lab_/orbital")({
  head: () => ({
    meta: [
      { title: "Orbital Mechanics — KINETIQ" },
      {
        name: "description",
        content:
          "Simulate satellite orbits: circular, elliptical and escape trajectories — Newton's law of gravitation, velocity Verlet integration, C++ physics engine.",
      },
    ],
  }),
  component: OrbitalPage,
});

/** Speed options suited for orbital timescales (LEO period ≈ 5500 s). */
const ORBITAL_SPEEDS = [
  { label: "100×",   value: 100 },
  { label: "500×",   value: 500 },
  { label: "1000×",  value: 1000 },
  { label: "5000×",  value: 5000 },
];

function OrbitalPage() {
  const host = useSim();
  const sim = useSimModule<OrbitalMechanicsState, OrbitalMechanicsInfo>(host, "orbital", {
    seriesRows: 1200,
  });
  const ready = useModulePage(host, sim, {
    id: "orbital-sim",
    label: "Orbital mechanics",
    href: "/lab/orbital",
  });
  const started = (sim.state?.time ?? 0) > 0;
  const bodyId = sim.state?.bodyId ?? sim.info?.analytic.bodyId ?? 0;

  // Default to 500× so a LEO orbit completes in ~11 real seconds.
  useEffect(() => {
    sim.setSpeed(500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SimLabLayout
      title="Gravitational force & orbital mechanics"
      phase={!ready ? "Loading" : sim.running ? "Running" : started ? "Paused" : "Ready"}
      tone={sim.running ? "running" : "idle"}
      error={sim.error}
      left={
        <>
          <OrbitalBodySelect
            value={bodyId}
            onChange={(id) => sim.setParameter("body", id)}
            disabled={!ready}
          />
          <SimParameterPanel
            parameters={sim.info?.parameters.filter((p) => p.name !== "body")}
            onChange={sim.setParameter}
            disabled={!ready}
            subtitle="Changing any value restarts the simulation"
          />
          <OrbitalEquations info={sim.info} state={sim.state} />
        </>
      }
      canvas={
        <OrbitalCanvas
          info={sim.info}
          state={sim.state}
          live={sim.live}
          series={sim.series}
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
          hideSpeed
          extra={
            <div className="flex items-center gap-2">
              <span className="label-micro">Sim speed</span>
              <SegmentedControl
                size="sm"
                value={sim.speed}
                onChange={sim.setSpeed}
                options={ORBITAL_SPEEDS}
              />
            </div>
          }
        />
      }
      below={
        <ChartDock
          tabs={[
            {
              id: "trajectory",
              label: "Trajectory",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="X position vs time"
                    series={sim.series}
                    lines={[{ channel: "x", label: "x (m)", color: "var(--cyan)" }]}
                  />
                  <SeriesChart
                    title="Y position vs time"
                    series={sim.series}
                    lines={[{ channel: "y", label: "y (m)", color: "var(--amber)" }]}
                  />
                </div>
              ),
            },
            {
              id: "orbit",
              label: "Orbit",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="Orbital radius r vs time"
                    series={sim.series}
                    lines={[{ channel: "r", label: "r (m)", color: "var(--amber)" }]}
                  />
                  <SeriesChart
                    title="Orbital speed vs time"
                    series={sim.series}
                    lines={[{ channel: "speed", label: "v (m/s)", color: "var(--cyan)" }]}
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
                    title="Gravitational potential energy U vs time"
                    series={sim.series}
                    lines={[{ channel: "U", label: "U (J)", color: "var(--red)" }]}
                  />
                  <SeriesChart
                    title="Total mechanical energy E vs time"
                    series={sim.series}
                    lines={[{ channel: "E", label: "E (J)", color: "var(--green)" }]}
                  />
                </div>
              ),
            },
            {
              id: "momentum",
              label: "Momentum",
              content: (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SeriesChart
                    title="Angular momentum L vs time"
                    series={sim.series}
                    lines={[{ channel: "L", label: "L (kg·m²/s)", color: "var(--purple)" }]}
                  />
                  <SeriesChart
                    title="Gravitational force vs time"
                    series={sim.series}
                    lines={[{ channel: "Fg", label: "F_g (N)", color: "var(--amber)" }]}
                  />
                </div>
              ),
            },
          ]}
        />
      }
      right={
        <>
          <OrbitalLive state={sim.state} />
          <OrbitalResults info={sim.info} state={sim.state} />
        </>
      }
    />
  );
}
