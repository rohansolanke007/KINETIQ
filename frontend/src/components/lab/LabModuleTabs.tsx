import { Link, useRouterState } from "@tanstack/react-router";
import { simulationModules } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Switches between the Lab's simulation modules. */
export function LabModuleTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Simulation modules"
      className="flex max-w-full flex-wrap gap-1 rounded-lg border border-border bg-card p-1"
    >
      {simulationModules.map((m) => {
        const active = pathname === m.to;
        return (
          <Link
            key={m.id}
            to={m.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
