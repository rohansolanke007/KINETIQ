import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  FlaskConical,
  History,
  Orbit,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { ConceptIllustration } from "@/components/dashboard/ConceptIllustration";
import { HeroSimulation } from "@/components/dashboard/HeroSimulation";
import { catalogStats, conceptAreas, type ConceptArea } from "@/lib/catalog";
import { recordExplored, useProgress, type ExploredKind } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KINETIQ — Interactive Physics Simulation Platform" },
      {
        name: "description",
        content:
          "Understand the laws of physics through experimentation, visualization and real-time calculations.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-10 px-4 py-6 sm:px-6 sm:py-8">
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div>
          <h1 className="max-w-[16ch] text-balance text-[34px] font-semibold leading-[1.08] tracking-tight sm:text-[44px]">
            Explore Physics Through Interactive Simulations
          </h1>
          <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-muted-foreground">
            Understand the laws of physics through experimentation, visualization and real-time
            calculations.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              to="/lab"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open Simulation Lab <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              to="/experiments"
              className="inline-flex h-10 items-center rounded-md border border-border bg-secondary px-4 text-[14px] font-medium transition-colors hover:border-primary/40 hover:bg-accent"
            >
              Start an experiment
            </Link>
          </div>
        </div>
        <HeroSimulation />
      </section>

      <StatStrip />
      <ExploreSection />
      <RecentSection />
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  note,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-primary/12 text-primary">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="label-micro">{label}</p>
        <p className="tech text-[26px] font-semibold leading-tight">{value}</p>
        {children}
        <p className="label-micro mt-0.5">{note}</p>
      </div>
    </div>
  );
}

function StatStrip() {
  const progress = useProgress();
  const explored = progress.experiments.filter((id) => id.length > 0).length;
  const pct =
    catalogStats.experiments === 0 ? 0 : Math.round((explored / catalogStats.experiments) * 100);

  return (
    <section
      aria-label="Platform summary"
      className="glass grid divide-y divide-border rounded-lg sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x"
    >
      <Stat
        icon={BookOpen}
        label="Physics concepts"
        value={String(catalogStats.concepts)}
        note={`${catalogStats.conceptsAvailable} interactive now`}
      />
      <Stat
        icon={Boxes}
        label="Simulation modules"
        value={String(catalogStats.modules)}
        note={`sandbox (${catalogStats.scenes} scenes) + ${catalogStats.modules - 1} dedicated simulations`}
      />
      <Stat
        icon={FlaskConical}
        label="Available experiments"
        value={String(catalogStats.experiments)}
        note={`${catalogStats.guidedExperiments} guided labs + ${catalogStats.lawDemos} law demonstrations`}
      />
      <Stat
        icon={TrendingUp}
        label="Learning progress"
        value={`${pct}%`}
        note={`${explored} of ${catalogStats.experiments} experiments explored`}
      >
        <div
          className="my-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Learning progress"
        >
          <div
            className="h-full rounded-full bg-green transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Stat>
    </section>
  );
}

const exploreButton =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-[13px] font-medium transition-colors hover:border-primary/50 hover:bg-accent";

function ConceptCard({ area }: { area: ConceptArea }) {
  const note = () =>
    recordExplored({ kind: "concept", id: area.id, label: area.name, href: area.to });
  return (
    <article className="glass flex flex-col rounded-lg p-3">
      <div className="h-[104px] rounded-md border border-border bg-background/50 p-2">
        <ConceptIllustration id={area.id} />
      </div>
      <h3 className="mt-3 text-[15px] font-semibold">{area.name}</h3>
      <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted-foreground">
        {area.description}
      </p>
      <div className="mt-3">
        {area.status === "planned" ? (
          <span className="inline-flex h-8 items-center rounded-md border border-dashed border-border px-3 text-[13px] text-muted-foreground">
            Planned
          </span>
        ) : (
          <Link to={area.to} onClick={note} className={exploreButton}>
            Explore <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}

function ExploreSection() {
  return (
    <section aria-labelledby="explore-heading">
      <h2 id="explore-heading" className="mb-3 text-[18px] font-semibold tracking-tight">
        Explore physics
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {conceptAreas.map((area) => (
          <ConceptCard key={area.id} area={area} />
        ))}
      </div>
    </section>
  );
}

const kindIcon: Record<ExploredKind, LucideIcon> = {
  scene: Orbit,
  experiment: FlaskConical,
  concept: BookOpen,
};
const kindLabel: Record<ExploredKind, string> = {
  scene: "Lab scene",
  experiment: "Experiment",
  concept: "Concept",
};

function timeAgo(at: number) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

function RecentSection() {
  const { recent } = useProgress();
  const router = useRouter();
  return (
    <section aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="mb-3 text-[18px] font-semibold tracking-tight">
        Recently explored
      </h2>
      {recent.length === 0 ? (
        <div className="glass flex items-center gap-3 rounded-lg px-5 py-4 text-[13.5px] text-muted-foreground">
          <History className="size-[18px] shrink-0" aria-hidden />
          Nothing yet. Load a scene in the Lab or open an experiment and it will appear here.
        </div>
      ) : (
        <ul className="glass divide-y divide-border rounded-lg">
          {recent.slice(0, 5).map((entry) => {
            const Icon = kindIcon[entry.kind];
            return (
              <li key={`${entry.kind}-${entry.id}`}>
                <a
                  href={entry.href}
                  onClick={(e) => {
                    e.preventDefault();
                    router.history.push(entry.href);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/60",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="flex-1 text-[14px] font-medium">{entry.label}</span>
                  <span className="label-micro hidden sm:inline">{kindLabel[entry.kind]}</span>
                  <span className="label-micro w-20 text-right">{timeAgo(entry.at)}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
