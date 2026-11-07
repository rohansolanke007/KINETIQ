import { createFileRoute, redirect } from "@tanstack/react-router";

// The formula library now lives under Physics Concepts; keep old links working.
export const Route = createFileRoute("/formulas")({
  beforeLoad: () => {
    throw redirect({ to: "/concepts" });
  },
});
