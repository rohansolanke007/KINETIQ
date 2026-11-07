import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Simulation } from "@/lib/physics/useSimulation";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const chartConfig = {
  velocity: {
    label: "Velocity",
    color: "var(--cyan)",
  },
} satisfies ChartConfig;

// Different colors for different bodies
const BODY_COLORS = ["var(--cyan)", "var(--blue)", "var(--purple)", "var(--green)", "var(--amber)"];

export function VelocityGraph({
  velocityHistory,
}: {
  velocityHistory: Simulation["velocityHistory"];
}) {
  if (velocityHistory.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-border bg-background/30">
        <div className="text-center">
          <p className="label-micro">Speed</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Run the simulation to generate graph data.
          </p>
        </div>
      </div>
    );
  }

  /*
   * Find every body that has appeared in the velocity history.
   * This allows the graph to automatically support multiple bodies.
   */
  const objectIds = Array.from(
    new Set(velocityHistory.flatMap((point) => Object.keys(point.velocities))),
  );

  const data = velocityHistory.map((point) => {
    const row: Record<string, number> = {
      time: Number(point.time.toFixed(2)),
    };

    for (const id of objectIds) {
      row[`velocity_${id}`] = Number((point.velocities[Number(id)] ?? 0).toFixed(3));
    }

    return row;
  });

  const allVelocities = objectIds.flatMap((id) =>
    data.map((point) => point[`velocity_${id}`] ?? 0),
  );

  const maxVelocity = Math.max(...allVelocities);

  const yMax = maxVelocity > 0 ? maxVelocity * 1.15 : 1;

  return (
    <div className="rounded-md border border-border bg-background/30 p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <span className="label-micro">Speed</span>

          {/* Body legend */}
          <div className="flex items-center gap-3">
            {objectIds.map((id, index) => {
              const color = BODY_COLORS[index % BODY_COLORS.length];

              return (
                <span
                  key={id}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground"
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                  Body #{id}
                </span>
              );
            })}
          </div>
        </div>

        <span className="tech text-[11px] text-muted-foreground">Speed (m/s) vs time (s)</span>
      </div>

      <ChartContainer config={chartConfig} className="h-48 w-full aspect-auto">
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 12,
            left: 4,
            bottom: 4,
          }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />

          <XAxis
            dataKey="time"
            type="number"
            domain={[0, "dataMax"]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 9 }}
            tickFormatter={(value) => `${Number(value).toFixed(1)}s`}
          />

          <YAxis
            domain={[0, yMax]}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tick={{ fontSize: 9 }}
            width={48}
            tickFormatter={(value) => Number(value).toFixed(1)}
          />

          <ChartTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => `Time: ${value}s`}
                formatter={(value, name) => [
                  `${Number(value).toFixed(2)} m/s`,
                  String(name).replace("velocity_", "Body #"),
                ]}
              />
            }
          />

          {objectIds.map((id, index) => {
            const color = BODY_COLORS[index % BODY_COLORS.length];

            return (
              <Line
                key={id}
                type="linear"
                dataKey={`velocity_${id}`}
                stroke={color}
                strokeWidth={3}
                dot={{
                  r: 2.5,
                  fill: color,
                  stroke: color,
                  strokeWidth: 1,
                }}
                activeDot={{
                  r: 5,
                  fill: color,
                  stroke: color,
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ChartContainer>

      <div className="mt-1 flex justify-between px-1 text-[11px] text-muted-foreground">
        <span>Time (s)</span>
        <span>Speed (m/s)</span>
      </div>
    </div>
  );
}
