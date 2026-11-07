import { Panel } from "@/components/physics/ui";
import { DataList, DataRow } from "@/components/lab/DataRows";
import { nf } from "@/components/lab/format";
import type { PhysicsState, SandboxAnalysis } from "@/lib/physics/engine";

/**
 * Energy and momentum of every moving body, from the C++ engine. The note
 * lists which settings currently dissipate mechanical energy.
 */
export function SandboxAnalysisPanel({
  analysis,
  state,
}: {
  analysis: SandboxAnalysis | null;
  state: PhysicsState | null;
}) {
  const sources: string[] = [];
  if (state?.frictionEnabled) sources.push("friction");
  if ((state?.restitution ?? 1) < 1) sources.push("inelastic collisions");
  if ((state?.wallRestitution ?? 1) < 1) sources.push("wall bounces");

  return (
    <Panel title="Energy and momentum" subtitle="All moving bodies together">
      <DataList>
        <DataRow label="Kinetic energy" value={nf(analysis?.kinetic, 2)} unit="J" />
        <DataRow
          label="Potential energy (above y = 0)"
          value={nf(analysis?.potential, 2)}
          unit="J"
        />
        <DataRow
          label="Mechanical energy"
          value={nf(analysis?.mechanical, 2)}
          unit="J"
          accent="var(--amber)"
        />
        <DataRow label="Momentum px" value={nf(analysis?.momentum.x, 2)} unit="kg·m/s" />
        <DataRow label="Momentum py" value={nf(analysis?.momentum.y, 2)} unit="kg·m/s" />
        <DataRow
          label="Total momentum |p|"
          value={nf(analysis?.momentum.magnitude, 2)}
          unit="kg·m/s"
          accent="var(--cyan)"
        />
      </DataList>
      <p className="label-micro mt-2 leading-relaxed">
        {sources.length === 0
          ? "Nothing here dissipates energy, so mechanical energy is conserved apart from a small numerical drift from the 0.05 s timestep."
          : `Mechanical energy is NOT conserved while ${sources.join(", ")} ${sources.length > 1 ? "are" : "is"} on: dissipative effects turn it into heat. Set restitution to 1 and friction to 0 to see it conserved.`}{" "}
        Momentum is conserved in collisions between bodies, but walls and gravity change it.
      </p>
    </Panel>
  );
}
