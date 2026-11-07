import { Check } from "lucide-react";
import { Panel } from "@/components/physics/ui";
import type { ProjectileInfo, ProjectileState } from "@/lib/physics/engine";

const f = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(digits);

function Row({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="tech text-[13.5px] font-medium">
        {value}
        {unit && value !== "—" && (
          <span className="ml-1 text-[11.5px] font-normal text-muted-foreground">{unit}</span>
        )}
      </dd>
    </div>
  );
}

/** Formula vs simulation: the C++ closed form next to what the stepped motion measured. */
export function ProjectileResults({
  info,
  state,
}: {
  info: ProjectileInfo | null;
  state: ProjectileState | null;
}) {
  if (!info) return null;
  const a = info.analytic;
  const m = state?.measured;
  const rows: {
    label: string;
    formula: number;
    measured: number | null | undefined;
    unit: string;
  }[] = [
    { label: "Time of flight T", formula: a.timeOfFlight, measured: m?.timeOfFlight, unit: "s" },
    { label: "Maximum height H", formula: a.maxHeight, measured: m?.maxHeight, unit: "m" },
    { label: "Horizontal range R", formula: a.range, measured: m?.range, unit: "m" },
  ];
  const done = state?.finished ?? false;

  return (
    <Panel
      title="Results"
      subtitle={
        done
          ? "Landed: simulation agrees with the formulas"
          : "Formula value, then the value measured as it flies"
      }
    >
      <table className="w-full text-left">
        <thead>
          <tr className="label-micro">
            <th className="pb-1.5 font-medium" />
            <th className="pb-1.5 text-right font-medium">Formula</th>
            <th className="pb-1.5 text-right font-medium">Simulated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const ready = r.measured !== null && r.measured !== undefined;
            const match =
              ready &&
              Math.abs((r.measured as number) - r.formula) <
                1e-6 * Math.max(1, Math.abs(r.formula));
            return (
              <tr key={r.label}>
                <td className="py-2 text-[13px] text-muted-foreground">{r.label}</td>
                <td className="tech py-2 text-right text-[13.5px] font-medium">
                  {f(r.formula)}{" "}
                  <span className="text-[11.5px] font-normal text-muted-foreground">{r.unit}</span>
                </td>
                <td className="tech py-2 text-right text-[13.5px] font-medium">
                  {done && match && (
                    <Check className="mr-1 inline size-3.5 text-green" aria-label="matches" />
                  )}
                  {f(r.measured)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <dl className="mt-3 divide-y divide-border border-t border-border pt-1">
        <Row label="Initial vx = u cos θ" value={f(a.ux)} unit="m/s" />
        <Row label="Initial vy = u sin θ" value={f(a.uy)} unit="m/s" />
        <Row label="Time to highest point" value={f(a.apexTime)} unit="s" />
        <Row label="Impact speed" value={f(a.impactSpeed)} unit="m/s" />
      </dl>
    </Panel>
  );
}

/** The three projectile equations with the current numbers substituted. */
export function ProjectileEquations({ info }: { info: ProjectileInfo | null }) {
  if (!info) return null;
  const p = Object.fromEntries(info.parameters.map((x) => [x.name, x.value])) as Record<
    string,
    number
  >;
  const a = info.analytic;
  const u = p["speed"] ?? 0;
  const th = p["angle"] ?? 0;
  const g = p["gravity"] ?? 0;
  const h0 = p["height"] ?? 0;

  const eq = (symbol: string, formula: string, sub: string, value: number, unit: string) => (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2.5">
      <div className="tech text-[14px] font-semibold text-primary">{formula}</div>
      <div className="tech mt-1 text-[12.5px] text-muted-foreground">{sub}</div>
      <div className="tech mt-0.5 text-[13.5px] font-medium">
        {symbol} = {f(value)} {unit}
      </div>
    </div>
  );

  return (
    <Panel
      title="Equations"
      subtitle={h0 > 0 ? "Launch height included in the C++ solution" : "Launch from ground level"}
    >
      <div className="space-y-2">
        {eq(
          "T",
          "T = 2u sin θ / g",
          `= 2 × ${f(u, 1)} × sin ${f(th, 1)}° / ${f(g)}`,
          a.timeOfFlight,
          "s",
        )}
        {eq(
          "H",
          "H = u² sin² θ / 2g",
          `= ${f(u, 1)}² × sin² ${f(th, 1)}° / (2 × ${f(g)})`,
          a.maxHeight,
          "m",
        )}
        {eq(
          "R",
          "R = u² sin 2θ / g",
          `= ${f(u, 1)}² × sin ${f(2 * th, 1)}° / ${f(g)}`,
          a.range,
          "m",
        )}
      </div>
      {h0 > 0 && (
        <p className="label-micro mt-3 leading-relaxed">
          With launch height h₀ = {f(h0, 1)} m the engine solves T = (u sin θ + √(u² sin² θ + 2gh₀))
          / g and H = h₀ + u² sin² θ / 2g. The three formulas above are the h₀ = 0 forms.
        </p>
      )}
    </Panel>
  );
}

/** Live position and velocity read from the running C++ simulation. */
export function ProjectileLive({ state }: { state: ProjectileState | null }) {
  return (
    <Panel
      title="Live values"
      subtitle={
        state?.finished ? "Landed" : state && state.time > 0 ? "In flight" : "Ready to launch"
      }
    >
      <dl className="divide-y divide-border">
        <Row label="Time t" value={f(state?.time, 2)} unit="s" />
        <Row label="Position x" value={f(state?.position.x)} unit="m" />
        <Row label="Position y" value={f(state?.position.y)} unit="m" />
        <Row label="Velocity vx (horizontal)" value={f(state?.velocity.x)} unit="m/s" />
        <Row label="Velocity vy (vertical)" value={f(state?.velocity.y)} unit="m/s" />
        <Row label="Speed |v|" value={f(state?.velocity.speed)} unit="m/s" />
        <Row label="Acceleration ay" value={f(state?.acceleration.y)} unit="m/s²" />
      </dl>
    </Panel>
  );
}
