import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, FlaskConical } from "lucide-react";

import { guidedExperiments } from "@/lib/experiments/guided";
import { moduleLabels } from "@/lib/analyticsConfig";
import { experiments as lawDemos } from "@/lib/physics/experiments";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/experiments")({
  head: () => ({
    meta: [
      { title: "Experiments — KINETIQ" },
      {
        name: "description",
        content:
          "Guided physics experiments with theory, a live simulation, recorded observations and a PDF report.",
      },
    ],
  }),
  component: ExperimentsHub,
});

const button =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-[13px] font-medium transition-colors hover:border-primary/50 hover:bg-accent";

function ExperimentsHub() {
  const { experiments: visited } = useProgress();
  return (
    <main className="mx-auto w-full max-w-[1180px] space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight">Experiments</h1>
        <p className="mt-2 max-w-[64ch] text-[15px] leading-relaxed text-muted-foreground">
          Each guided experiment sets out an objective and the theory, runs the C++ simulation with
          your parameters, records observations next to the formula results, and produces a PDF
          report.
        </p>
      </header>

      <section aria-labelledby="guided-heading">
        <h2 id="guided-heading" className="mb-3 text-[18px] font-semibold tracking-tight">
          Guided experiments
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {guidedExperiments.map((e, i) => (
            <article key={e.id} className="glass flex flex-col rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="label-micro">
                  Experiment {i + 1} · {moduleLabels[e.module]}
                </span>
                {visited.includes(e.id) && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-green">
                    <Check className="size-3.5" aria-hidden /> Opened
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-[16px] font-semibold leading-snug">{e.title}</h3>
              <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">
                {e.summary}
              </p>
              <div className="mt-4">
                <Link
                  to="/experiments/$experimentId"
                  params={{ experimentId: e.id }}
                  className={button}
                >
                  Start experiment <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="laws-heading">
        <h2 id="laws-heading" className="mb-3 text-[18px] font-semibold tracking-tight">
          Law demonstrations
        </h2>
        <article className="glass flex flex-wrap items-center justify-between gap-4 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FlaskConical className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h3 className="text-[15px] font-semibold">
                {lawDemos.length} sandbox demonstrations
              </h3>
              <p className="mt-1 max-w-[60ch] text-[13.5px] leading-relaxed text-muted-foreground">
                Newton's laws, uniform gravity, projectiles and friction shown on the sandbox world,
                each with a live calculation panel and the formula library alongside.
              </p>
            </div>
          </div>
          <Link to="/experiments/laws" className={button}>
            Open demonstrations <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </article>
      </section>
    </main>
  );
}
