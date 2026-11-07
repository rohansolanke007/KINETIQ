import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport } from "@/components/lab/SimTransport";
import { ActionButton, Panel, SegmentedControl } from "@/components/physics/ui";
import { VelocityGraph } from "@/components/simulator/VelocityGraph";
import { moduleCharts, moduleLabels, type ChartSpec, type ModuleId } from "@/lib/analyticsConfig";
import { downloadCsv } from "@/lib/export";
import type { SimParameter } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSandboxAnalysis } from "@/lib/physics/useSandboxAnalysis";
import { useSimModule, type SeriesData } from "@/lib/physics/useSimModule";
import { useLabShortcuts } from "@/lib/useLabWorkspace";
import { cn } from "@/lib/utils";

type Source = ModuleId | "sandbox";
const SOURCES: Source[] = ["projectile", "pendulum", "shm", "incline", "collision", "sandbox"];

export const Route = createFileRoute("/analytics")({
  validateSearch: (search: Record<string, unknown>): { module?: Source } =>
    typeof search["module"] === "string" && (SOURCES as string[]).includes(search["module"])
      ? { module: search["module"] as Source }
      : {},
  head: () => ({ meta: [{ title: "Analytics — KINETIQ" }] }),
  component: AnalyticsPage,
});

const sandboxCharts: ChartSpec[] = [
  {
    id: "energy",
    title: "Kinetic, potential and total mechanical energy vs time",
    lines: [
      { channel: "ke", label: "Kinetic", color: "var(--cyan)" },
      { channel: "pe", label: "Potential", color: "var(--purple)" },
      { channel: "e", label: "Total", color: "var(--amber)" },
    ],
  },
  {
    id: "momentum",
    title: "Total momentum vs time",
    lines: [
      { channel: "px", label: "px", color: "var(--blue)" },
      { channel: "py", label: "py", color: "var(--purple)" },
      { channel: "p", label: "|p|", color: "var(--amber)" },
    ],
  },
];

function seriesToCsv(series: SeriesData): (string | number)[][] {
  const header = series.channels.map((c, i) => (series.units[i] ? `${c} (${series.units[i]})` : c));
  return [header, ...series.rows];
}

function AnalyticsPage() {
  const host = useSim();
  const navigate = useNavigate({ from: "/analytics" });
  const { module: moduleParam } = Route.useSearch();
  const source: Source = moduleParam ?? "projectile";
  const isSandbox = source === "sandbox";
  const [windowSeconds, setWindowSeconds] = useState(10);

  const sim = useSimModule<{ finished: boolean; time: number }, { parameters: SimParameter[] }>(
    host,
    isSandbox ? null : source,
    { seriesRows: 1800 },
  );
  const sandbox = useSandboxAnalysis(host);

  // The sandbox is independent of the dedicated simulations; make sure nothing else is driving it.
  useEffect(() => {
    if (host.status === "ready") host.adoptWorld();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host.status]);

  const ready = host.status === "ready" && !sim.error;
  const running = isSandbox ? host.running : sim.running;
  const series = isSandbox ? sandbox.series : sim.series;
  const charts = isSandbox ? sandboxCharts : moduleCharts[source as ModuleId];
  const hasData = (series?.rows.length ?? 0) > 1;

  const play = useCallback(() => (isSandbox ? host.run() : sim.play()), [isSandbox, host, sim]);
  const pause = useCallback(() => (isSandbox ? host.pause() : sim.pause()), [isSandbox, host, sim]);
  const step = useCallback(
    () => (isSandbox ? host.stepOnce() : sim.stepFrame()),
    [isSandbox, host, sim],
  );
  const reset = useCallback(
    () => (isSandbox ? void host.restart() : sim.reset()),
    [isSandbox, host, sim],
  );
  useLabShortcuts({
    enabled: ready,
    running,
    onPlay: play,
    onPause: pause,
    onStep: step,
    onReset: reset,
  });

  const exportCsv = () => {
    // the complete recording, not only the visible window
    const full = isSandbox
      ? (() => {
          const m = host.module.current;
          return m ? (JSON.parse(m.getAnalysisSeriesJSON(0)) as SeriesData) : null;
        })()
      : sim.fetchSeries(0);
    if (!full || full.rows.length === 0) return;
    downloadCsv(`kinetiq-${source}-${Date.now()}.csv`, seriesToCsv(full));
  };

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 max-w-[62ch] text-[14px] text-muted-foreground">
            Graphs of the data the C++ engine records while a simulation runs. Change a parameter,
            press Play, and the graphs update live.
          </p>
        </div>
        <ActionButton onClick={exportCsv} disabled={!hasData}>
          <Download className="size-3.5" aria-hidden /> Export CSV
        </ActionButton>
      </div>

      <nav
        aria-label="Data source"
        className="flex max-w-full flex-wrap gap-1 rounded-lg border border-border bg-card p-1"
      >
        {SOURCES.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={source === id}
            onClick={() => void navigate({ search: { module: id }, replace: true })}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              source === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {id === "sandbox" ? "Sandbox (from the Lab)" : moduleLabels[id]}
          </button>
        ))}
      </nav>

      {sim.error && (
        <div
          role="alert"
          className="rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-[13px] text-red"
        >
          {sim.error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-3">
          {isSandbox ? (
            <Panel title="Sandbox world" subtitle="Edited in the Simulation Lab">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                These graphs follow whatever is running in the sandbox world: its total energy and
                momentum, recorded by C++ at every step.
              </p>
              <Link
                to="/lab"
                className="mt-3 inline-flex h-8 items-center rounded-md border border-border bg-secondary px-3 text-[12.5px] font-medium hover:bg-accent"
              >
                Open the Simulation Lab
              </Link>
            </Panel>
          ) : (
            <SimParameterPanel
              parameters={sim.info?.parameters}
              onChange={sim.setParameter}
              disabled={!ready}
            />
          )}
          <SimTransport
            running={running}
            finished={!isSandbox && (sim.state?.finished ?? false)}
            disabled={!ready}
            speed={isSandbox ? host.speed : sim.speed}
            onSpeed={isSandbox ? host.setSpeed : sim.setSpeed}
            onPlay={play}
            onPause={pause}
            onStep={step}
            onReset={reset}
          />
          <Panel title="Time window" subtitle="Part of the recording shown in each graph">
            <SegmentedControl
              value={windowSeconds}
              onChange={setWindowSeconds}
              options={[
                { label: "10 s", value: 10 },
                { label: "30 s", value: 30 },
              ]}
            />
          </Panel>
        </div>

        <div>
          {!hasData && (
            <div className="glass mb-4 rounded-lg px-5 py-4 text-[14px] text-muted-foreground">
              No data yet. Press Play (or Space) and the graphs fill in as the engine steps.
            </div>
          )}
          <div className="grid gap-3 xl:grid-cols-2">
            {charts.map((spec) => (
              <SeriesChart
                key={spec.id}
                title={spec.title}
                series={series}
                lines={spec.lines}
                windowSeconds={windowSeconds}
                height={210}
              />
            ))}
            {isSandbox && <VelocityGraph velocityHistory={host.velocityHistory} />}
          </div>
          {!isSandbox && source === "collision" && (
            <p className="label-micro mt-3 leading-relaxed">
              Two bodies on a frictionless track have no potential energy, and their acceleration is
              zero except during the instantaneous impact, so momentum is shown in place of those
              two graphs.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
