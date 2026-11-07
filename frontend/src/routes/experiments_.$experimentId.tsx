import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ExperimentCanvas } from "@/components/experiments/ExperimentCanvas";
import { ResultsTable } from "@/components/experiments/ResultsTable";
import { EquationCard } from "@/components/lab/DataRows";
import { SeriesChart } from "@/components/lab/SeriesChart";
import { SimParameterPanel } from "@/components/lab/SimParameterPanel";
import { SimTransport } from "@/components/lab/SimTransport";
import { ActionButton, Panel } from "@/components/physics/ui";
import { moduleLabels } from "@/lib/analyticsConfig";
import { downloadCsv } from "@/lib/export";
import { getGuidedExperiment, errorPercent, type GuidedExperiment } from "@/lib/experiments/guided";
import {
  loadNotes,
  loadObservations,
  saveNotes,
  saveObservations,
  type Observation,
} from "@/lib/experiments/observations";
import { generateReport } from "@/lib/experiments/report";
import type { SimParameter } from "@/lib/physics/engine";
import { useSim } from "@/lib/physics/SimulationContext";
import { useSimModule } from "@/lib/physics/useSimModule";
import { recordExplored } from "@/lib/progress";
import { useLabShortcuts } from "@/lib/useLabWorkspace";

export const Route = createFileRoute("/experiments_/$experimentId")({
  head: ({ params }) => ({
    meta: [
      { title: `${getGuidedExperiment(params.experimentId)?.title ?? "Experiment"} — KINETIQ` },
    ],
  }),
  component: ExperimentRoute,
});

function ExperimentRoute() {
  const { experimentId } = Route.useParams();
  const experiment = getGuidedExperiment(experimentId);
  if (!experiment) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-10">
        <h1 className="text-[22px] font-semibold">Experiment not found</h1>
        <p className="mt-2 text-muted-foreground">
          There is no guided experiment called “{experimentId}”.
        </p>
        <Link
          to="/experiments"
          className="mt-4 inline-flex items-center gap-1.5 text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to all experiments
        </Link>
      </main>
    );
  }
  // key: switching experiments remounts the page so no state leaks between them
  return <ExperimentRun key={experiment.id} experiment={experiment} />;
}

type AnyState = { finished: boolean; time: number };
type AnyInfo = { parameters: SimParameter[] };

function ExperimentRun({ experiment: exp }: { experiment: GuidedExperiment }) {
  const host = useSim();
  const sim = useSimModule<AnyState, AnyInfo>(host, exp.simType);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = host.status === "ready" && !sim.error;

  // Free the shared engine, log the visit, and restore anything the student saved earlier.
  useEffect(() => {
    if (host.status !== "ready") return;
    host.adoptWorld();
    host.pause();
    recordExplored({
      kind: "experiment",
      id: exp.id,
      label: exp.title,
      href: `/experiments/${exp.id}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host.status]);
  useEffect(() => {
    setObservations(loadObservations(exp.id));
    setNotes(loadNotes(exp.id));
  }, [exp.id]);

  // Apply the experiment's initial conditions through the C++ parameter API, once.
  const applied = useRef(false);
  const applyInitial = useCallback(
    (parameters: SimParameter[]) => {
      for (const p of parameters) {
        const want = exp.initial[p.name];
        if (want !== undefined && Math.abs(want - p.value) > 1e-12) sim.setParameter(p.name, want);
      }
    },
    [exp, sim],
  );
  useEffect(() => {
    if (!sim.info || applied.current) return;
    applied.current = true;
    applyInitial(sim.info.parameters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.info]);

  useLabShortcuts({
    enabled: ready,
    running: sim.running,
    onPlay: sim.play,
    onPause: sim.pause,
    onStep: sim.stepFrame,
    onReset: sim.reset,
  });

  const evaluation = sim.info && sim.state ? exp.evaluate(sim.info, sim.state, sim.series) : null;
  const params = sim.info?.parameters ?? [];
  const adjustable = params.filter((p) => exp.adjustable.includes(p.name));
  const fixed = params.filter((p) => !exp.adjustable.includes(p.name));
  const started = (sim.state?.time ?? 0) > 0;

  const record = () => {
    if (!evaluation?.complete) return;
    const next: Observation[] = [
      ...observations,
      {
        id: Date.now(),
        at: Date.now(),
        conditions: params.map((p) => ({ label: p.label, value: p.value, unit: p.unit })),
        results: evaluation.results,
      },
    ];
    setObservations(next);
    saveObservations(exp.id, next);
    toast.success(`Run ${next.length} recorded.`);
  };

  const clearObservations = () => {
    setObservations([]);
    saveObservations(exp.id, []);
  };

  const exportObservations = () => {
    if (observations.length === 0) return;
    const first = observations[0];
    if (!first) return;
    const header = [
      "run",
      ...first.conditions.map((c) => (c.unit ? `${c.label} (${c.unit})` : c.label)),
      ...first.results.flatMap((r) => [
        `${r.label} formula (${r.unit})`,
        `${r.label} simulated (${r.unit})`,
        `${r.label} error (%)`,
      ]),
    ];
    const rows = observations.map((o, i) => [
      i + 1,
      ...o.conditions.map((c) => c.value),
      ...o.results.flatMap((r) => [r.formula ?? "", r.measured ?? "", errorPercent(r) ?? ""]),
    ]);
    downloadCsv(`kinetiq-${exp.id}-observations.csv`, [header, ...rows]);
  };

  const downloadReport = async () => {
    if (!sim.info) return;
    setBusy(true);
    try {
      await generateReport({
        experiment: exp,
        parameters: params,
        results: evaluation?.results ?? [],
        observations,
        notes,
        series: sim.fetchSeries(0),
      });
      toast.success("Report downloaded.");
    } catch (e) {
      console.error(e);
      toast.error("The report could not be generated.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-6 sm:px-6">
      <div>
        <Link
          to="/experiments"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> All experiments
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-micro">{moduleLabels[exp.module]}</p>
            <h1 className="text-[24px] font-semibold tracking-tight">{exp.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              disabled={!ready}
              onClick={() => sim.info && applyInitial(sim.info.parameters)}
              title="Put every parameter back to the experiment's starting values"
            >
              <RotateCcw className="size-3.5" aria-hidden /> Restore initial conditions
            </ActionButton>
            <ActionButton
              tone="primary"
              disabled={!ready || busy}
              onClick={() => void downloadReport()}
            >
              <FileText className="size-3.5" aria-hidden />{" "}
              {busy ? "Preparing…" : "Download PDF report"}
            </ActionButton>
          </div>
        </div>
      </div>

      {sim.error && (
        <div
          role="alert"
          className="rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-[13px] text-red"
        >
          {sim.error}
        </div>
      )}

      {/* objective, theory, equations */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Objective">
          <p className="text-[14px] leading-relaxed">{exp.objective}</p>
          <p className="label-micro mt-4 mb-1.5">Try this</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-muted-foreground">
            {exp.tasks.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </Panel>
        <Panel title="Theory">
          <div className="space-y-3 text-[13.5px] leading-relaxed text-muted-foreground">
            {exp.theory.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        </Panel>
        <Panel title="Relevant equations">
          <div className="space-y-2">
            {exp.equations.map((e) => (
              <EquationCard
                key={e.text}
                formula={e.text}
                {...(e.note ? { substitution: e.note } : {})}
              />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        {/* parameters */}
        <div className="space-y-3">
          <SimParameterPanel
            title="Adjustable parameters"
            subtitle="Changing a value restarts the run"
            parameters={adjustable}
            onChange={sim.setParameter}
            disabled={!ready}
          />
          {fixed.length > 0 && (
            <Panel
              title="Fixed by the experiment"
              subtitle="Initial conditions you cannot change here"
            >
              <dl className="divide-y divide-border">
                {fixed.map((p) => (
                  <div key={p.name} className="flex items-baseline justify-between gap-3 py-1.5">
                    <dt className="text-[13px] text-muted-foreground">{p.label}</dt>
                    <dd className="tech text-[13.5px] font-medium">
                      {Number(p.value.toPrecision(5))}{" "}
                      <span className="text-[11.5px] font-normal text-muted-foreground">
                        {p.unit}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
        </div>

        {/* simulation */}
        <div className="space-y-3">
          <div className="glass relative h-[400px] overflow-hidden rounded-lg">
            <ExperimentCanvas
              module={exp.module}
              info={sim.info}
              state={sim.state}
              live={sim.live as never}
              forces={sim.forces}
            />
          </div>
          <SimTransport
            running={sim.running}
            finished={sim.state?.finished ?? false}
            disabled={!ready}
            speed={sim.speed}
            onSpeed={sim.setSpeed}
            onPlay={sim.play}
            onPause={sim.pause}
            onStep={sim.stepFrame}
            onReset={sim.reset}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {exp.charts.map((c) => (
              <SeriesChart
                key={c.id}
                title={c.title}
                series={sim.series}
                lines={c.lines}
                height={200}
              />
            ))}
          </div>
        </div>

        {/* results and observations */}
        <div className="space-y-3">
          <Panel
            title="Calculated results"
            subtitle={evaluation?.complete ? "Formula and simulation agree" : exp.waitingFor}
          >
            {evaluation ? (
              <ResultsTable rows={evaluation.results} pending={!evaluation.complete} />
            ) : (
              <p className="text-[13px] text-muted-foreground">Loading…</p>
            )}
            <ActionButton
              tone="primary"
              className="mt-3 w-full"
              disabled={!evaluation?.complete}
              onClick={record}
              title={evaluation?.complete ? "Add this run to your observations" : exp.waitingFor}
            >
              Record this run
            </ActionButton>
            {!evaluation?.complete && started && (
              <p className="label-micro mt-2">{exp.waitingFor}</p>
            )}
          </Panel>

          <Panel
            title={`Observations (${observations.length})`}
            subtitle="Every recorded run, kept in this browser"
            actions={
              <div className="flex gap-1">
                <ActionButton
                  tone="ghost"
                  disabled={observations.length === 0}
                  onClick={exportObservations}
                  title="Download the observations as CSV"
                >
                  <Download className="size-3.5" aria-hidden />
                  <span className="sr-only">Export observations as CSV</span>
                </ActionButton>
                <ActionButton
                  tone="ghost"
                  disabled={observations.length === 0}
                  onClick={clearObservations}
                  title="Delete all recorded runs"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  <span className="sr-only">Clear observations</span>
                </ActionButton>
              </div>
            }
          >
            {observations.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Nothing recorded yet. Run the experiment, then choose “Record this run”. Change a
                parameter and repeat to build a table of observations.
              </p>
            ) : (
              <ol className="space-y-3">
                {observations.map((o, i) => (
                  <li
                    key={o.id}
                    className="rounded-md border border-border bg-background/40 p-2.5 text-[12.5px]"
                  >
                    <p className="font-semibold">Run {i + 1}</p>
                    <p className="mt-0.5 leading-snug text-muted-foreground">
                      {o.conditions
                        .filter((c) =>
                          exp.adjustable.some(
                            (a) => params.find((p) => p.name === a)?.label === c.label,
                          ),
                        )
                        .map(
                          (c) =>
                            `${c.label} ${Number(c.value.toPrecision(4))}${c.unit ? ` ${c.unit}` : ""}`,
                        )
                        .join(" · ")}
                    </p>
                    <ul className="tech mt-1.5 space-y-0.5">
                      {o.results.map((r) => {
                        const e = errorPercent(r);
                        return (
                          <li key={r.label} className="flex justify-between gap-2">
                            <span className="text-muted-foreground">{r.label}</span>
                            <span>
                              {r.measured === null ? "—" : r.measured.toFixed(r.digits)}
                              {e !== null && (
                                <span className="ml-1 text-[11px] text-muted-foreground">
                                  ({e < 0.0001 ? "<0.0001" : e.toFixed(4)}%)
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Your notes and conclusion" subtitle="Included in the PDF report">
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                saveNotes(exp.id, e.target.value);
              }}
              rows={5}
              aria-label="Notes and conclusion"
              placeholder="What did you observe? Do the formula and simulation agree? What happens when you change a parameter?"
              className="w-full resize-y rounded-md border border-input bg-background/60 px-3 py-2 text-[13.5px] leading-relaxed outline-none focus:border-primary/70 focus:ring-2 focus:ring-ring/30"
            />
          </Panel>
        </div>
      </div>
    </main>
  );
}
