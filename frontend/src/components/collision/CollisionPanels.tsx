import { Check } from "lucide-react";
import { Panel } from "@/components/physics/ui";
import { DataList, DataRow, EquationCard } from "@/components/lab/DataRows";
import { nf } from "@/components/lab/format";
import type { CollisionInfo, CollisionState } from "@/lib/physics/engine";

const param = (info: CollisionInfo, name: string) =>
  info.parameters.find((p) => p.name === name)?.value ?? 0;

export function CollisionLive({ state }: { state: CollisionState | null }) {
  return (
    <Panel title="Live values" subtitle={state?.collided ? "After the collision" : "Approaching"}>
      <DataList>
        <DataRow label="Time t" value={nf(state?.time)} unit="s" />
        <DataRow label="Velocity v₁" value={nf(state?.v1, 3)} unit="m/s" accent="var(--blue)" />
        <DataRow label="Velocity v₂" value={nf(state?.v2, 3)} unit="m/s" accent="var(--cyan)" />
        <DataRow label="Momentum p₁ = m₁v₁" value={nf(state?.p1, 3)} unit="kg·m/s" />
        <DataRow label="Momentum p₂ = m₂v₂" value={nf(state?.p2, 3)} unit="kg·m/s" />
        <DataRow
          label="Total momentum p"
          value={nf(state?.momentum, 3)}
          unit="kg·m/s"
          accent="var(--amber)"
        />
        <DataRow label="Kinetic energy of 1" value={nf(state?.kinetic.k1, 3)} unit="J" />
        <DataRow label="Kinetic energy of 2" value={nf(state?.kinetic.k2, 3)} unit="J" />
        <DataRow
          label="Total kinetic energy"
          value={nf(state?.kinetic.total, 3)}
          unit="J"
          accent="var(--amber)"
        />
      </DataList>
    </Panel>
  );
}

/** Before-and-after comparison, with the C++ formula next to what the simulation produced. */
export function CollisionComparison({
  info,
  state,
}: {
  info: CollisionInfo | null;
  state: CollisionState | null;
}) {
  if (!info) return null;
  const a = info.analytic;
  const before = state?.before ?? null;
  const after = state?.after ?? null;
  const rows = [
    {
      label: "Velocity v₁ (m/s)",
      before: param(info, "v1"),
      measured: after?.v1,
      formula: a.v1After,
      d: 2,
    },
    {
      label: "Velocity v₂ (m/s)",
      before: param(info, "v2"),
      measured: after?.v2,
      formula: a.v2After,
      d: 2,
    },
    {
      label: "Total momentum (kg·m/s)",
      before: a.momentumBefore,
      measured: after?.momentum,
      formula: a.momentumAfter,
      d: 2,
    },
    {
      label: "Kinetic energy (J)",
      before: a.kineticBefore,
      measured: after?.kinetic,
      formula: a.kineticAfter,
      d: 2,
    },
  ];
  const conserved =
    after !== null && before !== null && Math.abs(after.momentum - before.momentum) < 1e-6;
  return (
    <Panel
      title="Before and after"
      subtitle={
        a.willCollide
          ? `${a.kind[0]?.toUpperCase()}${a.kind.slice(1)} collision`
          : "The bodies never meet"
      }
    >
      <table className="w-full text-left">
        <thead>
          <tr className="label-micro">
            <th className="pb-1.5 font-medium" />
            <th className="pb-1.5 pl-3 text-right font-medium">Before</th>
            <th className="pb-1.5 pl-3 text-right font-medium">After</th>
            <th className="pb-1.5 pl-3 text-right font-medium">Formula</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-1.5 pr-2 text-[12.5px] leading-tight text-muted-foreground">
                {r.label}
              </td>
              <td className="tech py-1.5 pl-3 text-right text-[13px] font-medium">
                {nf(r.before, r.d)}
              </td>
              <td
                className="tech py-1.5 pl-3 text-right text-[13px] font-medium"
                style={{ color: "var(--cyan)" }}
              >
                {nf(r.measured, r.d)}
              </td>
              <td className="tech py-1.5 pl-3 text-right text-[13px] text-muted-foreground">
                {a.willCollide ? nf(r.formula, r.d) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {a.willCollide && (
        <div className="mt-3 space-y-1.5 text-[13px] leading-relaxed">
          <p className="flex items-start gap-1.5">
            {conserved ? (
              <Check className="mt-0.5 size-4 shrink-0 text-green" aria-hidden />
            ) : (
              <span className="mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            <span>
              <strong className="font-semibold">Momentum is conserved</strong> in every collision:
              the two bodies push on each other with equal and opposite forces.
            </span>
          </p>
          <p className="text-muted-foreground">
            {a.kineticLost < 1e-9
              ? "Kinetic energy is conserved too, because e = 1 (elastic)."
              : `Kinetic energy lost: ${nf(a.kineticLost, 3)} J, turned into heat and deformation (e = ${nf(param(info, "restitution"))}).`}
          </p>
        </div>
      )}
    </Panel>
  );
}

export function CollisionEquations({ info }: { info: CollisionInfo | null }) {
  if (!info) return null;
  const a = info.analytic;
  const e = param(info, "restitution");
  return (
    <Panel title="Equations" subtitle="Momentum and restitution">
      <div className="space-y-2">
        <EquationCard
          formula="m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′"
          result={`p = ${nf(a.momentumBefore, 3)} kg·m/s, before and after`}
        />
        <EquationCard
          formula="e = (v₂′ − v₁′) / (v₁ − v₂)"
          substitution="speed of separation / speed of approach"
          result={`e = ${nf(e)}  (${a.kind})`}
        />
        <EquationCard
          formula="ΔKE = ½ μ (1 − e²) v_rel²"
          substitution="μ = m₁m₂ / (m₁ + m₂)"
          result={`KE lost = ${nf(a.kineticLost, 3)} J`}
        />
      </div>
      <p className="label-micro mt-3 leading-relaxed">
        e = 1 keeps all the kinetic energy (elastic); e = 0 leaves the bodies moving together
        (perfectly inelastic). In between, some kinetic energy is lost but momentum never is. The
        engine splits the timestep exactly at contact.
      </p>
    </Panel>
  );
}
