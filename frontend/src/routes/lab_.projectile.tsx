import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ChartDock } from "@/components/lab/ChartDock";
import { EnergyTab } from "@/components/lab/EnergyTab";
import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimLabLayout } from "@/components/lab/SimLabLayout";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport, ToggleChip } from "@/components/lab/SimTransport";
import { ActionButton, Panel } from "@/components/physics/ui";
import { FreeBodyDiagram } from "@/components/fbd/FreeBodyDiagram";
import {
  ProjectileEquations,
  ProjectileLive,
  ProjectileResults,
} from "@/components/projectile/ProjectileResults";
import { TrajectoryCanvas } from "@/components/projectile/TrajectoryCanvas";
import type { ProjectileInfo, ProjectileState } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSimModule } from "@/lib/physics/useSimModule";
import { useModulePage } from "@/lib/useModulePage";

export const Route = createFileRoute("/lab_/projectile")({
  head: () => ({
    meta: [
      { title: "Projectile Motion — KINETIQ" },
      {
        name: "description",
        content:
          "Launch a projectile, vary speed, angle and gravity, and compare the C++ simulation with T, H and R.",
      },
    ],
  }),
  component: ProjectilePage,
});

// Surface gravity of familiar worlds, offered as one-click presets.
const gravityPresets = [
  { label: "Earth", g: 9.81 },
  { label: "Moon", g: 1.62 },
  { label: "Mars", g: 3.71 },
  { label: "Jupiter", g: 24.79 },
];

function ProjectilePage() {
  const host = useSim();
  const sim = useSimModule<ProjectileState, ProjectileInfo>(host, "projectile");
  const [vectors, setVectors] = useState(true);
  const [prediction, setPrediction] = useState(true);
  const ready = useModulePage(host, sim, {
    id: "projectile-sim",
    label: "Projectile motion",
    href: "/lab/projectile",
  });
  const finished = sim.state?.finished ?? false;
  const gravity = sim.info?.parameters.find((p) => p.name === "gravity")?.value;
  const phase = !ready
    ? "Loading"
    : sim.running
      ? "In flight"
      : finished
        ? "Landed"
        : sim.state && sim.state.time > 0
          ? "Paused"
          : "Ready";

  return (
    <SimLabLayout
      title="Projectile motion"
      phase={phase}
      tone={sim.running ? "running" : finished ? "done" : "idle"}
      error={sim.error}
      left={
        <>
          <SimParameterPanel
            parameters={sim.info?.parameters}
            onChange={sim.setParameter}
            disabled={!ready}
            subtitle="Changing a value restarts the launch"
          >
            <div>
              <p className="label-micro mb-1.5">Gravity presets</p>
              <div className="grid grid-cols-4 gap-1.5">
                {gravityPresets.map((p) => (
                  <ActionButton
                    key={p.label}
                    tone={
                      gravity !== undefined && Math.abs(gravity - p.g) < 0.005
                        ? "primary"
                        : "default"
                    }
                    className="px-0"
                    disabled={!ready}
                    title={`${p.g} m/s²`}
                    onClick={() => sim.setParameter("gravity", p.g)}
                  >
                    {p.label}
                  </ActionButton>
                ))}
              </div>
            </div>
          </SimParameterPanel>
          <ProjectileEquations info={sim.info} />
        </>
      }
      canvas={
        <>
          <TrajectoryCanvas
            info={sim.info}
            state={sim.state}
            live={sim.live}
            showVectors={vectors}
            showPrediction={prediction}
          />
          <div className="pointer-events-none absolute left-4 top-3 flex items-center gap-4 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-cyan" aria-hidden /> Simulated path
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 border-t-2 border-dashed border-muted-foreground" aria-hidden />{" "}
              Predicted path
            </span>
          </div>
        </>
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
                label="Velocity vectors"
                active={vectors}
                onClick={() => setVectors((v) => !v)}
              />
              <ToggleChip
                label="Predicted path"
                active={prediction}
                onClick={() => setPrediction((v) => !v)}
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
                    title="Height y"
                    series={sim.series}
                    lines={[{ channel: "y", label: "y", color: "var(--cyan)" }]}
                  />
                  <SeriesChart
                    title="Velocity components"
                    series={sim.series}
                    lines={[
                      { channel: "vx", label: "vx", color: "var(--blue)" },
                      { channel: "vy", label: "vy", color: "var(--purple)" },
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
                    conserved: true,
                    headline: "Mechanical energy is conserved.",
                    detail: `Kinetic energy is traded for potential energy on the way up and back on the way down; the total stays at ${(sim.state?.energy.total ?? 0).toFixed(2)} J (drift ${((sim.state?.energy.drift ?? 0) * 100).toFixed(5)}%). This only holds because there is no air resistance, a dissipative force.`,
                  }}
                />
              ),
            },
          ]}
        />
      }
      right={
        <>
          <ProjectileLive state={sim.state} />
          <FreeBodyDiagram
            data={sim.forces}
            shape="circle"
            subtitle="Forces on the projectile"
            footnote="In flight only gravity acts; after landing the ground pushes back with the normal force."
          />
          <ProjectileResults info={sim.info} state={sim.state} />
          <Panel title="About this model">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Constant gravity, no air resistance. The C++ engine integrates with velocity Verlet,
              which is exact for constant acceleration, and fixes the landing instant inside a step,
              so the simulated T, H and R match the formulas.
            </p>
          </Panel>
        </>
      }
    />
  );
}
