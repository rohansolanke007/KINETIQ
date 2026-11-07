import { Check } from "lucide-react";
import { Panel } from "@/components/physics/ui";
import { DataList, DataRow, EquationCard } from "@/components/lab/DataRows";
import { nf } from "@/components/lab/format";
import type { InclineInfo, InclineState } from "@/lib/physics/engine";

const param = (info: InclineInfo, name: string) =>
  info.parameters.find((p) => p.name === name)?.value ?? 0;

const regimeText: Record<InclineState["regime"], string> = {
  static: "At rest: static friction holds",
  sliding: "Sliding",
  bottom: "Reached the bottom",
  top: "Reached the top",
};

export function InclineLive({ state }: { state: InclineState | null }) {
  return (
    <Panel title="Live values" subtitle={state ? regimeText[state.regime] : "Ready"}>
      <DataList>
        <DataRow label="Time t" value={nf(state?.time)} unit="s" />
        <DataRow label="Distance from bottom s" value={nf(state?.s, 3)} unit="m" />
        <DataRow label="Velocity (up slope +)" value={nf(state?.v, 3)} unit="m/s" />
        <DataRow label="Acceleration" value={nf(state?.a, 3)} unit="m/s²" />
        <DataRow label="Kinetic energy" value={nf(state?.energy.kinetic, 3)} unit="J" />
        <DataRow label="Potential energy" value={nf(state?.energy.potential, 3)} unit="J" />
        <DataRow
          label="Heat from friction"
          value={nf(state?.energy.frictionHeat, 3)}
          unit="J"
          accent="var(--red)"
        />
        <DataRow label="Work by applied force" value={nf(state?.energy.appliedWork, 3)} unit="J" />
      </DataList>
      <p className="label-micro mt-2 leading-relaxed">
        Kinetic friction turns mechanical energy into heat, so KE + PE falls by exactly the heat
        produced (plus whatever the applied force adds).
      </p>
    </Panel>
  );
}

export function InclineAnalysis({
  info,
  state,
}: {
  info: InclineInfo | null;
  state: InclineState | null;
}) {
  if (!info) return null;
  const a = info.analytic;
  const needed = Math.abs(a.friction);
  const measured = state?.measured.timeToEnd ?? null;
  const diff =
    measured !== null && a.timeToEnd ? ((measured - a.timeToEnd) / a.timeToEnd) * 100 : null;
  return (
    <Panel title="Force analysis" subtitle="Calculated by the C++ engine">
      <DataList>
        <DataRow label="Normal force N = mg cos θ" value={nf(a.normalForce)} unit="N" />
        <DataRow label="Weight along slope mg sin θ" value={nf(a.weightAlongSlope)} unit="N" />
        <DataRow label="Weight into surface mg cos θ" value={nf(a.weightPerpendicular)} unit="N" />
        <DataRow label="Max static friction μs N" value={nf(a.maxStaticFriction)} unit="N" />
        <DataRow label="Kinetic friction μk N" value={nf(a.kineticFriction)} unit="N" />
        <DataRow
          label="Net force along slope"
          value={nf(a.netForce)}
          unit="N"
          accent="var(--amber)"
        />
        <DataRow label="Acceleration" value={nf(a.acceleration, 3)} unit="m/s²" />
      </DataList>
      <div className="mt-3 rounded-md border border-border bg-background/40 px-3 py-2.5 text-[13px] leading-relaxed">
        {a.slides ? (
          <>
            <strong className="font-semibold">
              It slides {a.direction === "up" ? "up" : "down"} the slope.
            </strong>{" "}
            The pull along the slope exceeds the largest static friction ({nf(a.maxStaticFriction)}{" "}
            N), so kinetic friction of {nf(a.kineticFriction)} N opposes the motion.
          </>
        ) : (
          <>
            <strong className="font-semibold">It stays at rest.</strong> Static friction only has to
            supply {nf(needed)} N, and it can provide up to {nf(a.maxStaticFriction)} N. At μs ={" "}
            {nf(param(info, "mu_s"))} the block starts to slide beyond {nf(a.criticalAngleDeg, 1)}°.
          </>
        )}
      </div>
      {a.slides && a.timeToEnd !== null && (
        <div className="mt-3">
          <DataList>
            <DataRow label="Time to the end (formula)" value={nf(a.timeToEnd, 3)} unit="s" />
            <DataRow
              label="Time to the end (measured)"
              value={nf(measured, 3)}
              unit="s"
              accent="var(--cyan)"
            />
            <DataRow label="Speed there (formula)" value={nf(a.speedAtEnd, 3)} unit="m/s" />
            <DataRow
              label="Speed there (measured)"
              value={nf(state?.measured.speedAtEnd, 3)}
              unit="m/s"
              accent="var(--cyan)"
            />
          </DataList>
          {diff !== null && (
            <p className="label-micro mt-2 flex items-center gap-1.5">
              <Check className="size-3.5 text-green" aria-hidden />
              Measured time differs from the formula by {Math.abs(diff).toFixed(4)}%.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

export function InclineEquations({ info }: { info: InclineInfo | null }) {
  if (!info) return null;
  const a = info.analytic;
  const m = param(info, "mass");
  const g = param(info, "gravity");
  const th = param(info, "angle");
  const muK = param(info, "mu_k");
  return (
    <Panel title="Equations" subtitle="Coulomb friction, stick and slip">
      <div className="space-y-2">
        <EquationCard
          formula="N = mg cos θ"
          substitution={`= ${nf(m, 1)} × ${nf(g)} × cos ${nf(th, 1)}°`}
          result={`N = ${nf(a.normalForce)} N`}
        />
        <EquationCard
          formula="f ≤ μs N  (at rest)"
          substitution="f = μk N  (sliding)"
          result={`f max = ${nf(a.maxStaticFriction)} N, fk = ${nf(a.kineticFriction)} N`}
        />
        <EquationCard
          formula="a = g (sin θ − μk cos θ)"
          substitution={`= ${nf(g)} (sin ${nf(th, 1)}° − ${nf(muK)} cos ${nf(th, 1)}°)`}
          result={
            a.slides ? `|a| = ${nf(Math.abs(a.acceleration), 3)} m/s²` : "a = 0 (it does not slide)"
          }
        />
        <EquationCard formula="tan θc = μs" result={`θc = ${nf(a.criticalAngleDeg, 1)}°`} />
      </div>
      <p className="label-micro mt-3 leading-relaxed">
        Mass cancels from the acceleration. The engine advances the block with exact
        constant-acceleration kinematics and splits a step where the block stops or reaches an end
        of the slope.
      </p>
    </Panel>
  );
}
