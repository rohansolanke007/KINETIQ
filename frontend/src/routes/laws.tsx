import { createFileRoute, redirect } from "@tanstack/react-router";

// Guided law demonstrations now live under Experiments > Law demonstrations; keep old links working.
export const Route = createFileRoute("/laws")({
  beforeLoad: () => {
    throw redirect({ to: "/experiments/laws" });
  },
});
