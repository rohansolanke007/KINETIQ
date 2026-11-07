import { Check, TriangleAlert } from "lucide-react";
import { SeriesChart, type SeriesLine } from "@/components/lab/SeriesChart";
import type { SeriesData } from "@/lib/physics/useSimModule";
import { nf } from "./format";

const KE = "var(--cyan)";
const PE = "var(--purple)";
const TOTAL = "var(--amber)";
const HEAT = "var(--red)";

/** Stacked bar: how the energy is split right now, against the energy the run started with. */
function EnergyBar({
  kinetic,
  potential,
  heat = 0,
  reference,
}: {
  kinetic: number;
  potential: number;
  heat?: number;
  reference: number;
}) {
  const ref = Math.max(reference, kinetic + potential + heat, 1e-9);
  const pct = (v: number) => `${Math.max(0, (v / ref) * 100)}%`;
  return (
    <div>
      <div
        className="flex h-5 overflow-hidden rounded-md border border-border bg-background/60"
        role="img"
        aria-label={`Kinetic ${nf(kinetic)} joules, potential ${nf(potential)} joules${heat > 0 ? `, heat ${nf(heat)} joules` : ""}`}
      >
        <div style={{ width: pct(kinetic), backgroundColor: KE }} />
        <div style={{ width: pct(potential), backgroundColor: PE }} />
        {heat > 0 && <div style={{ width: pct(heat), backgroundColor: HEAT }} />}
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px]">
        <Legend color={KE} label="Kinetic" value={kinetic} />
        <Legend color={PE} label="Potential" value={potential} />
        {heat > 0 && <Legend color={HEAT} label="Heat from friction" value={heat} />}
        <Legend color={TOTAL} label="Mechanical total" value={kinetic + potential} />
      </dl>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden />
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tech font-medium">{nf(value, 2)} J</dd>
    </div>
  );
}

/**
 * Whether mechanical energy is conserved depends on the forces: only
 * conservative forces (gravity, springs) keep KE + PE constant. Friction and
 * inelastic collisions turn it into heat.
 */
export function ConservationBanner({
  conserved,
  headline,
  detail,
}: {
  conserved: boolean;
  headline: string;
  detail: string;
}) {
  const Icon = conserved ? Check : TriangleAlert;
  return (
    <div
      className={
        "flex gap-2.5 rounded-md border px-3 py-2.5 text-[13px] leading-relaxed " +
        (conserved ? "border-green/40 bg-green/10" : "border-amber/40 bg-amber/10")
      }
    >
      <Icon
        className={"mt-0.5 size-4 shrink-0 " + (conserved ? "text-green" : "text-amber")}
        aria-hidden
      />
      <p>
        <strong className="font-semibold">{headline}</strong> {detail}
      </p>
    </div>
  );
}

/** KE / PE / total over time, the live energy split, and the conservation verdict. */
export function EnergyTab({
  series,
  kinetic,
  potential,
  initial,
  heat,
  banner,
  extraLines = [],
}: {
  series: SeriesData | null;
  kinetic: number;
  potential: number;
  /** Mechanical energy at the start of the run. */
  initial: number;
  heat?: number;
  banner: { conserved: boolean; headline: string; detail: string };
  extraLines?: SeriesLine[];
}) {
  const lines: SeriesLine[] = [
    { channel: "ke", label: "Kinetic", color: KE },
    { channel: "pe", label: "Potential", color: PE },
    { channel: "e", label: "Total", color: TOTAL },
    ...extraLines,
  ];
  return (
    <div className="space-y-3">
      <EnergyBar
        kinetic={kinetic}
        potential={potential}
        reference={initial}
        {...(heat !== undefined ? { heat } : {})}
      />
      <SeriesChart title="Energy over time" series={series} lines={lines} height={170} />
      <ConservationBanner {...banner} />
    </div>
  );
}
