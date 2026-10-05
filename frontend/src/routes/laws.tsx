import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  StepForward,
} from "lucide-react";

import { WorldCanvas } from "@/components/physics/WorldCanvas";
import {
  ActionButton,
  Panel,
  Readout,
  SegmentedControl,
} from "@/components/physics/ui";
import { TelemetryBar } from "@/components/simulator/TelemetryBar";
import { experiments } from "@/lib/physics/experiments";
import { useSimulation } from "@/lib/physics/useSimulation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/laws")({
  head: () => ({
    meta: [
      {
        title: "Physics Laws — Interactive Demonstrations",
      },
      {
        name: "description",
        content:
          "Interactive demonstrations of Newton's laws, momentum, energy, friction and projectile motion.",
      },
      {
        property: "og:title",
        content: "Physics Laws — Interactive Demonstrations",
      },
      {
        property: "og:description",
        content:
          "Run guided mechanics experiments driven by a C++ physics engine.",
      },
    ],
  }),
  component: LawsPage,
});

function LawsPage() {
  const sim = useSimulation();

  const [activeId, setActiveId] = useState(
    experiments[0]!.id,
  );

  const active =
    experiments.find((e) => e.id === activeId) ??
    experiments[0]!;

  useEffect(() => {
    if (sim.status !== "ready") return;

    sim.pause();
    sim.call((m) => active.build(m));

    // Rebuild the C++ world whenever the experiment changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, sim.status]);

  const disabled = sim.status !== "ready";

  const calculation = active.calculation(sim.state);

  return (
    <main className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col gap-3 p-3 sm:p-4">
      <h1 className="sr-only">
        Physics laws demonstrations
      </h1>

      <TelemetryBar
        state={sim.state}
        status={sim.status}
      />

<div className="grid min-h-0 flex-1 gap-3 xl:h-[calc(100vh-9rem)] xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        {/* ================================================== */}
        {/* LEFT — EXPERIMENT LIBRARY                         */}
        {/* ================================================== */}

        <Panel
          title="EXPERIMENT LIBRARY"
          subtitle={`${experiments.length} guided demonstrations`}
        >
          <div className="space-y-2">
            {experiments.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setActiveId(e.id)}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-left transition-all",
                  e.id === activeId
                    ? "border-primary/50 bg-primary/10"
                    : "border-border bg-background/40 hover:bg-accent",
                )}
              >
                <div className="label-micro">
                  {String(i + 1).padStart(2, "0")} ·{" "}
                  {e.law}
                </div>

                <div className="tech mt-1 text-[11px] tracking-[0.12em] text-foreground">
                  {e.name}
                </div>

                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {e.description}
                </p>
              </button>
            ))}
          </div>
        </Panel>

        {/* ================================================== */}
        {/* CENTER — SIMULATION                               */}
        {/* ================================================== */}

<div className="flex min-h-0 h-full flex-col gap-3">
          <div className="glass flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5">

            <ActionButton
              tone="primary"
              disabled={disabled}
              onClick={() =>
                sim.running
                  ? sim.pause()
                  : sim.run()
              }
            >
              {sim.running ? (
                <Pause className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}

              {sim.running
                ? "PAUSE"
                : "RUN EXPERIMENT"}
            </ActionButton>

            <ActionButton
              disabled={disabled}
              onClick={sim.stepOnce}
            >
              <StepForward className="size-3.5" />
              STEP
            </ActionButton>

            <ActionButton
              disabled={disabled}
              onClick={() => {
                sim.pause();
                sim.call((m) =>
                  active.build(m),
                );
              }}
            >
              <RotateCcw className="size-3.5" />
              RESTART
            </ActionButton>

            <div className="ml-auto w-48">
              <SegmentedControl
                size="sm"
                value={sim.speed}
                onChange={sim.setSpeed}
                options={[
                  {
                    label: "0.25×",
                    value: 0.25,
                  },
                  {
                    label: "0.5×",
                    value: 0.5,
                  },
                  {
                    label: "1×",
                    value: 1,
                  },
                  {
                    label: "2×",
                    value: 2,
                  },
                ]}
              />
              
            </div>
            
          </div>
          
          
          

<div className="glass min-h-0 flex-1 overflow-hidden rounded-xl">            <WorldCanvas
              state={sim.state}
              selectedId={null}
              showGrid
              showVectors
            />
          </div>
          <Panel
  title="LIVE CALCULATION"
  subtitle="Calculated from the C++ simulation state"
>
  <div className="space-y-3">

    <div>
      <div className="label-micro mb-1">
        FORMULA
      </div>

      <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-[13px] text-primary">
        {calculation.formula}
      </div>
    </div>

    <div>
      <div className="label-micro mb-2">
        VARIABLES
      </div>

      <div className="grid grid-cols-2 gap-2">
        {calculation.variables.map(
          (variable) => (
            <div
              key={`${variable.symbol}-${variable.label}`}
              className="rounded-md border border-border bg-background/40 px-2.5 py-2"
            >

              <div className="flex items-center justify-between gap-2">

                <span className="font-mono text-[11px] text-primary">
                  {variable.symbol}
                </span>

                <span className="text-[10px] text-muted-foreground">
                  {variable.unit ?? ""}
                </span>

              </div>

              <div className="mt-1 text-[10px] text-muted-foreground">
                {variable.label}
              </div>

              <div className="mt-1 font-mono text-[12px] text-foreground">
                {variable.value}
              </div>

            </div>
          ),
        )}
      </div>
    </div>

    <div>
      <div className="label-micro mb-1">
        SUBSTITUTION
      </div>

      <div className="rounded-md border border-border bg-background/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground">
        {calculation.substitution}
      </div>
    </div>

    <div>
      <div className="label-micro mb-1">
        RESULT
      </div>

      <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[12px] text-primary">
        {calculation.result}
      </div>
    </div>

  </div>
</Panel>
        </div>

        {/* ================================================== */}
        {/* RIGHT — FORMULAS + CALCULATIONS                   */}
        {/* ================================================== */}

        <div className="scroll-thin flex max-h-[calc(100vh-9rem)] flex-col gap-3 overflow-y-auto xl:max-h-none">

          {/* CURRENT EXPERIMENT */}

          <Panel
            title={active.name}
            subtitle={active.law}
          >
            <div className="space-y-3">

              <div className="tech rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-[12px] text-primary">
                {active.formula}
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {active.explanation}
              </p>

            </div>
          </Panel>

          {/* ================================================= */}
          {/* FORMULA LIBRARY                                  */}
          {/* ================================================= */}

          <Panel
            title="FORMULA LIBRARY"
            subtitle="Select a law to load its demonstration"
          >
            <div className="scroll-thin max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {experiments.map((experiment) => (
                <button
                  key={experiment.id}
                  type="button"
                  onClick={() =>
                    setActiveId(experiment.id)
                  }
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left transition-all",
                    experiment.id === activeId
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-background/40 hover:bg-accent",
                  )}
                >

                  <div className="flex items-center justify-between gap-2">

                    <span className="label-micro">
                      {experiment.law}
                    </span>

                    {experiment.id === activeId && (
                      <span className="text-[9px] text-primary">
                        ACTIVE
                      </span>
                    )}

                  </div>

                  <div className="tech mt-1 text-[11px] text-foreground">
                    {experiment.name}
                  </div>

                  <div className="mt-1 rounded border border-border/50 bg-background/50 px-2 py-1 font-mono text-[10px] text-primary">
                    {experiment.formula}
                  </div>

                </button>
              ))}

            </div>
          </Panel>

          {/* ================================================= */}
          {/* CALCULATION                                      */}
          {/* ================================================= */}

          
          {/* ================================================= */}
          {/* LIVE MEASUREMENTS                                */}
          {/* ================================================= */}

          <Panel
            title="LIVE MEASUREMENTS"
            subtitle="Read directly from the C++ state"
          >
            <div className="grid grid-cols-2 gap-2">

              {active.readouts(sim.state).map(
                (r, i) => (
                  <Readout
                    key={`${r.label}-${i}`}
                    label={r.label}
                    value={r.value}
                    unit={r.unit ?? ""}
                  />
                ),
              )}

            </div>
          </Panel>

        </div>
      </div>
    </main>
  );
}