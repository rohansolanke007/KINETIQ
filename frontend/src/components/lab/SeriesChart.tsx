import { memo, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesData } from "@/lib/physics/useSimModule";

const MAX_POINTS = 360;

export interface SeriesLine {
  channel: string;
  label: string;
  color: string;
}

/**
 * Plots channels recorded by the C++ simulation against time. Data is the
 * engine's own time series; nothing is generated here.
 */
function SeriesChartImpl({
  title,
  series,
  lines,
  windowSeconds = 10,
  height = 190,
}: {
  title: string;
  series: SeriesData | null;
  lines: SeriesLine[];
  windowSeconds?: number;
  height?: number;
}) {
  const channels = series?.channels ?? [];
  const tIndex = channels.indexOf("t");
  const rows = series?.rows ?? [];
  const tEnd = rows.length && tIndex >= 0 ? (rows[rows.length - 1]?.[tIndex] ?? 0) : 0;
  const tStart = Math.max(0, tEnd - windowSeconds);

  // Plot at most MAX_POINTS points: a chart is a few hundred pixels wide, so more points only
  // cost rendering time. The newest sample is always kept so the live edge is exact.
  const data = useMemo(() => {
    if (tIndex < 0) return [];
    const inWindow = rows.filter((r) => (r[tIndex] ?? 0) >= tStart);
    const stride = Math.max(1, Math.ceil(inWindow.length / MAX_POINTS));
    const picked = inWindow.filter((_, i) => i % stride === 0 || i === inWindow.length - 1);
    return picked.map((r) => {
      const point: Record<string, number> = { t: r[tIndex] ?? 0 };
      for (const l of lines) {
        const i = channels.indexOf(l.channel);
        if (i >= 0) point[l.channel] = r[i] ?? 0;
      }
      return point;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, tStart, tIndex, lines]);

  const unit = (channel: string) => series?.units[channels.indexOf(channel)] ?? "";
  const yUnit = lines[0] ? unit(lines[0].channel) : "";

  return (
    <figure className="rounded-md border border-border bg-background/40 p-3">
      <figcaption className="mb-1 flex items-center justify-between text-[12.5px]">
        <span className="font-medium">{title}</span>
        <span className="flex gap-3">
          {lines.map((l) => (
            <span key={l.channel} className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-0.5 w-4" style={{ backgroundColor: l.color }} aria-hidden />
              {l.label}
            </span>
          ))}
        </span>
      </figcaption>
      <div style={{ height }} role="img" aria-label={`${title} versus time`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 16, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[tStart, Math.max(tEnd, tStart + 1)]}
              tickFormatter={(v: number) => v.toFixed(1)}
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 11 }}
              label={{
                value: "Time (s)",
                position: "insideBottom",
                offset: -8,
                fontSize: 11,
                fill: "var(--muted-foreground)",
              }}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 11 }}
              width={46}
              tickFormatter={(v: number) => Number(v.toPrecision(3)).toString()}
              label={{
                value: yUnit,
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "var(--muted-foreground)",
              }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(v) => `t = ${Number(v).toFixed(2)} s`}
              formatter={(value, name) => [
                `${Number(value).toFixed(3)} ${unit(String(name))}`,
                lines.find((l) => l.channel === name)?.label ?? String(name),
              ]}
            />
            {lines.map((l) => (
              <Line
                key={l.channel}
                type="monotone"
                dataKey={l.channel}
                stroke={l.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/** Re-renders only when its data, window or lines change. */
export const SeriesChart = memo(SeriesChartImpl);
