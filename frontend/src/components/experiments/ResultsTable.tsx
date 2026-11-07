import { Check } from "lucide-react";
import { errorPercent, type ResultRow } from "@/lib/experiments/guided";
import { nf } from "@/components/lab/format";

/** Formula (calculated by C++) next to the value the simulation produced. */
export function ResultsTable({ rows, pending }: { rows: ResultRow[]; pending: boolean }) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="label-micro">
          <th className="pb-1.5 font-medium" />
          <th className="pb-1.5 pl-2 text-right font-medium">Formula</th>
          <th className="pb-1.5 pl-2 text-right font-medium">Simulated</th>
          <th className="pb-1.5 pl-2 text-right font-medium">Error</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r) => {
          const e = errorPercent(r);
          return (
            <tr key={r.label}>
              <td className="py-2 pr-1 text-[12.5px] leading-tight text-muted-foreground">
                {r.label} <span className="text-[11px]">({r.unit})</span>
              </td>
              <td className="tech py-2 pl-2 text-right text-[13px] font-medium">
                {nf(r.formula, r.digits)}
              </td>
              <td
                className="tech py-2 pl-2 text-right text-[13px] font-medium"
                style={{ color: "var(--cyan)" }}
              >
                {pending && r.measured === null ? "…" : nf(r.measured, r.digits)}
              </td>
              <td className="tech py-2 pl-2 text-right text-[12px] text-muted-foreground">
                {e === null ? (
                  "—"
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {e < 0.01 && <Check className="size-3 text-green" aria-label="agrees" />}
                    {e < 0.0001 ? "<0.0001" : e.toFixed(4)}%
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
