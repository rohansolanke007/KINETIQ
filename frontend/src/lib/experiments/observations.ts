import type { ResultRow } from "./guided";

/** One recorded run: the conditions it used and what the formulas and the simulation gave. */
export interface Observation {
  id: number;
  at: number;
  conditions: { label: string; value: number; unit: string }[];
  results: ResultRow[];
}

const key = (experimentId: string, kind: "obs" | "notes") =>
  `kinetiq.experiment.${experimentId}.${kind}`;

/** Observations and notes live in localStorage so a student can leave and come back. */
export function loadObservations(experimentId: string): Observation[] {
  try {
    const raw = window.localStorage.getItem(key(experimentId, "obs"));
    const parsed = raw ? (JSON.parse(raw) as Observation[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveObservations(experimentId: string, list: Observation[]) {
  try {
    window.localStorage.setItem(key(experimentId, "obs"), JSON.stringify(list));
  } catch {
    /* storage unavailable: observations last for this visit only */
  }
}

export function loadNotes(experimentId: string): string {
  try {
    return window.localStorage.getItem(key(experimentId, "notes")) ?? "";
  } catch {
    return "";
  }
}

export function saveNotes(experimentId: string, notes: string) {
  try {
    window.localStorage.setItem(key(experimentId, "notes"), notes);
  } catch {
    /* ignore */
  }
}
