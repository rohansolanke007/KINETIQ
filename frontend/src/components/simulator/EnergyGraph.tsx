import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import type { Simulation } from "@/lib/physics/useSimulation";

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

const chartConfig = {
  kineticEnergy: {
    label: "Kinetic Energy",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

export function EnergyGraph({
  energyHistory,
}: {
  energyHistory: Simulation["energyHistory"];
}) {
  if (energyHistory.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-border bg-background/30">
        <div className="text-center">
          <p className="label-micro">KINETIC ENERGY</p>

          <p className="mt-1 text-[10px] text-muted-foreground">
            Run the simulation to generate graph data.
          </p>
        </div>
      </div>
    );
  }

  const data = energyHistory.map((point) => ({
  time: Number(point.time.toFixed(2)),
  kineticEnergy: Number(point.kineticEnergy.toFixed(3)),
}));

  const energies = data.map((point) => point.kineticEnergy);

  const minEnergy = Math.min(...energies);
  const maxEnergy = Math.max(...energies);

  const range = maxEnergy - minEnergy;

  const padding =
    range > 0
      ? range * 0.2
      : Math.max(Math.abs(maxEnergy) * 0.1, 1);

  const yMin = Math.max(0, minEnergy - padding);
  const yMax = maxEnergy + padding;

  return (
    <div className="rounded-md border border-border bg-background/30 p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="label-micro">
            KINETIC ENERGY
          </span>

          <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-amber-500" />
            ENERGY
          </span>
        </div>

        <span className="tech text-[9px] text-muted-foreground">
          TIME → ENERGY
        </span>
      </div>

      <ChartContainer
        config={chartConfig}
        className="h-48 w-full aspect-auto"
      >
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 12,
            left: 4,
            bottom: 4,
          }}
        >
          <CartesianGrid
            vertical={true}
            horizontal={true}
            strokeDasharray="3 3"
            opacity={0.2}
          />

         <XAxis
            dataKey="time"
            type="number"
            domain={[0, "dataMax"]}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tick={{ fontSize: 9 }}
            tickFormatter={(value) => `${Number(value).toFixed(1)}s`}
          />

          <YAxis
            domain={[yMin, yMax]}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tick={{ fontSize: 9 }}
            width={48}
            tickFormatter={(value) =>
              Number(value).toFixed(1)
            }
          />

          <ChartTooltip
            cursor={{
              stroke: "#f59e0b",
              strokeDasharray: "4 4",
            }}
            content={
              <ChartTooltipContent
                labelFormatter={(value) =>
                  `Time: ${value}s`
                }
                formatter={(value) => [
                  `${Number(value).toFixed(3)} J`,
                  "Kinetic Energy",
                ]}
              />
            }
          />

          <Line
            type="linear"
            dataKey="kineticEnergy"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: "#f59e0b",
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>

      <div className="mt-1 flex justify-between px-1 text-[9px] text-muted-foreground">
        <span>TIME (s)</span>
        <span>ENERGY (J)</span>
      </div>
    </div>
  );
}