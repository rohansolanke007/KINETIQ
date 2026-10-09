import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Atom, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopNavigation() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLaws = pathname.startsWith("/laws");
  const isFormulas = pathname.startsWith("/formulas");

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("physics-lab-theme");

    if (savedTheme === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDark;

    setIsDark(nextIsDark);

    if (nextIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("physics-lab-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("physics-lab-theme", "light");
    }
  };

  const modes = [
  {
    label: "SIMULATOR",
    to: "/",
    active: !isLaws && !isFormulas,
  },
  {
    label: "PHYSICS LAWS",
    to: "/laws",
    active: isLaws,
  },
  {
    label: "FORMULA LIBRARY",
    to: "/formulas",
    active: isFormulas,
  },
] as const;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
            <Atom className="size-4" />
          </span>

          <span className="leading-tight">
            <span className="block text-[13px] font-semibold tracking-wide">
              KINETIQ
            </span>
            <span className="label-micro">
              Interactive Physics Simulator
            </span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-background/50 p-1">
          {modes.map((mode) => (
            <Link
              key={mode.to}
              to={mode.to}
              className={cn(
                "tech rounded-md px-3 py-1.5 text-[10px] tracking-[0.16em] transition-all sm:px-4",
                mode.active
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_-6px_var(--primary)]"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {mode.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="ml-1 grid size-8 place-items-center rounded-md text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
          >
            {isDark ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
