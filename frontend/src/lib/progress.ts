import { useSyncExternalStore } from "react";

/**
 * Lightweight persistence for "Recently explored" and "Learning progress".
 * Stored in localStorage; every read is guarded so SSR and private-mode
 * browsers simply see an empty history.
 */
export type ExploredKind = "scene" | "experiment" | "concept";

export interface ExploredEntry {
  kind: ExploredKind;
  id: string;
  label: string;
  href: string;
  at: number;
}

export interface ProgressData {
  experiments: string[];
  recent: ExploredEntry[];
}

const KEY = "kinetiq.progress.v1";
const EMPTY: ProgressData = { experiments: [], recent: [] };
const MAX_RECENT = 8;

let cachedRaw: string | null = null;
let cached: ProgressData = EMPTY;
const listeners = new Set<() => void>();

function read(): ProgressData {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<ProgressData>) : null;
    cached = {
      experiments: Array.isArray(parsed?.experiments) ? parsed.experiments : [],
      recent: Array.isArray(parsed?.recent) ? parsed.recent : [],
    };
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function write(next: ProgressData) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: progress is simply not persisted */
  }
  listeners.forEach((l) => l());
}

/** Records that something was opened. Experiments also count toward progress. */
export function recordExplored(entry: Omit<ExploredEntry, "at">) {
  if (typeof window === "undefined") return;
  const current = read();
  const recent = [
    { ...entry, at: Date.now() },
    ...current.recent.filter((e) => !(e.kind === entry.kind && e.id === entry.id)),
  ].slice(0, MAX_RECENT);
  const experiments =
    entry.kind === "experiment" && !current.experiments.includes(entry.id)
      ? [...current.experiments, entry.id]
      : current.experiments;
  write({ experiments, recent });
}

export function clearProgress() {
  if (typeof window === "undefined") return;
  write({ experiments: [], recent: [] });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useProgress(): ProgressData {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
