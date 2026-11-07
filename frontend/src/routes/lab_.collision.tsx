import { createFileRoute } from "@tanstack/react-router";

import { CollisionCanvas } from "@/components/collision/CollisionCanvas";
import {
  CollisionComparison,
  CollisionEquations,
  CollisionLive,
} from "@/components/collision/CollisionPanels";
import { ChartDock } from "@/components/lab/ChartDock";
import { ConservationBanner } from "@/components/lab/EnergyTab";
import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimLabLayout } from "@/components/lab/SimLabLayout";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport } from "@/components/lab/SimTransport";
import { ActionButton } from "@/components/physics/ui";
import type { CollisionInfo, CollisionState } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSimModule } from "@/lib/physics/useSimModule";
import { useModulePage } from "@/lib/useModulePage";

export const Route = createFileRoute("/lab_/collision")({
  head: () => ({
    meta: [
      { title: "Collisions — KINETIQ" },
      {
        name: "description",
        content:
          "Elastic and inelastic collisions: momentum, restitution and kinetic energy, before and after.",
      },
    ],
  }),
  component: CollisionPage,
});

const presets = [
  { label: "Elastic", e: 1, hint: "e = 1" },
  { label: "Inelastic", e: 0.5, hint: "e = 0.5" },
  { label: "Sticky", e: 0, hint: "e = 0, perfectly inelastic" },
];

function CollisionPage() {
  const host = useSim();
  const sim = useSimModule<CollisionState, CollisionInfo>(host, "collision");
  const ready = useModulePage(host, sim, {
    id: "collision-sim",
    label: "Collisions",
    href: "/lab/collision",
  });
  const finished = sim.state?.finished ?? false;
  const e = sim.info?.parameters.find((p) => p.name === "restitution")?.value;
  const a = sim.info?.analytic;
  const lost = a?.kineticLost ?? 0;

  const phase = !ready
    ? "Loading"
    : sim.state?.collided
      ? "Collided"
      : sim.running
        ? "Approaching"
        : finished
          ? "No collision"
          : "Ready";

  return (
    <SimLabLayout
      title="Collisions"
      phase={phase}
      tone={sim.running ? "running" : sim.state?.collided ? "done" : "idle"}
      error={sim.error}
      left={
        <>
          <SimParameterPanel
            parameters={sim.info?.parameters}
            onChange={sim.setParameter}
            disabled={!ready}
            subtitle="Changing a value restarts the run"
          >
            <div>
              <p className="label-micro mb-1.5">Collision type</p>
              <div className="grid grid-cols-3 gap-1.5">
                {presets.map((p) => (
                  <ActionButton
                    key={p.label}
                    tone={e !== undefined && Math.abs(e - p.e) < 0.005 ? "primary" : "default"}
                    className="px-0"
                    disabled={!ready}
                    title={p.hint}
                    onClick={() => sim.setParameter("restitution", p.e)}
                  >
                    {p.label}
                  </ActionButton>
                ))}
              </div>
            </div>
          </SimParameterPanel>
          <CollisionEquations info={sim.info} />
        </>
      }
      canvas={<CollisionCanvas info={sim.info} state={sim.state} live={sim.live} />}
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
        />
      }
      below={
        <ChartDock
          tabs={[
            {
              id: "momentum",
              label: "Momentum",
              content: (
                <SeriesChart
                  title="Momentum of each body and the total"
                  series={sim.series}
                  lines={[
                    { channel: "p1", label: "p₁", color: "var(--blue)" },
                    { channel: "p2", label: "p₂", color: "var(--cyan)" },
                    { channel: "p", label: "Total", color: "var(--amber)" },
                  ]}
                  height={200}
                />
              ),
            },
            {
              id: "velocity",
              label: "Velocity",
              content: (
                <SeriesChart
                  title="Velocity of each body"
                  series={sim.series}
                  lines={[
                    { channel: "v1", label: "v₁", color: "var(--blue)" },
                    { channel: "v2", label: "v₂", color: "var(--cyan)" },
                  ]}
                  height={200}
                />
              ),
            },
            {
              id: "energy",
              label: "Energy",
              content: (
                <div className="space-y-3">
                  <SeriesChart
                    title="Kinetic energy"
                    series={sim.series}
                    lines={[
                      { channel: "k1", label: "KE₁", color: "var(--blue)" },
                      { channel: "k2", label: "KE₂", color: "var(--cyan)" },
                      { channel: "ke", label: "Total", color: "var(--amber)" },
                    ]}
                    height={170}
                  />
                  <ConservationBanner
                    conserved={lost < 1e-9}
                    headline={
                      lost < 1e-9
                        ? "Kinetic energy is conserved."
                        : "Kinetic energy is not conserved."
                    }
                    detail={
                      lost < 1e-9
                        ? "In an elastic collision (e = 1) the bodies exchange kinetic energy but the total is unchanged."
                        : `The collision is inelastic: ${lost.toFixed(2)} J of kinetic energy becomes heat and deformation. Momentum is still conserved, because the forces between the bodies are equal and opposite.`
                    }
                  />
                </div>
              ),
            },
          ]}
        />
      }
      right={
        <>
          <CollisionLive state={sim.state} />
          <CollisionComparison info={sim.info} state={sim.state} />
        </>
      }
    />
  );
}
