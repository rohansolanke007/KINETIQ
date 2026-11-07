import { niceStep } from "@/components/physics/canvasKit";
import { PRINT_COLOR, type ChartSpec } from "@/lib/analyticsConfig";
import type { SeriesData } from "@/lib/physics/useSimModule";

const INK = "#111827";
const GRID = "#d1d5db";
const MUTED = "#4b5563";

/**
 * Draws a graph of recorded C++ data onto an off-screen canvas with a white
 * background, so the PDF looks the same whatever theme the app is using.
 * Returns a PNG data URL, or null when there is nothing to plot.
 */
export function renderChartPng(
  series: SeriesData | null,
  spec: ChartSpec,
  size = { width: 900, height: 340 },
): string | null {
  if (!series || series.rows.length < 2) return null;
  const tIndex = series.channels.indexOf("t");
  if (tIndex < 0) return null;

  const lines = spec.lines
    .map((l) => ({ ...l, index: series.channels.indexOf(l.channel) }))
    .filter((l) => l.index >= 0);
  if (lines.length === 0) return null;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = size.width * scale;
  canvas.height = size.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);

  const W = size.width;
  const H = size.height;
  const pad = { left: 74, right: 20, top: 44, bottom: 52 };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;

  const ts = series.rows.map((r) => r[tIndex] ?? 0);
  const t0 = Math.min(...ts);
  const t1 = Math.max(...ts);
  let lo = Infinity;
  let hi = -Infinity;
  for (const l of lines) {
    for (const r of series.rows) {
      const v = r[l.index] ?? 0;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!(hi > lo)) {
    lo -= 1;
    hi += 1;
  }
  const margin = (hi - lo) * 0.08;
  lo -= margin;
  hi += margin;

  const X = (t: number) => pad.left + ((t - t0) / Math.max(t1 - t0, 1e-12)) * pw;
  const Y = (v: number) => pad.top + (1 - (v - lo) / (hi - lo)) * ph;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // grid and tick labels
  ctx.font = "12px Helvetica, Arial, sans-serif";
  ctx.fillStyle = MUTED;
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  const yStep = niceStep((hi - lo) / 5);
  ctx.textAlign = "right";
  for (let v = Math.ceil(lo / yStep) * yStep; v <= hi + 1e-9; v += yStep) {
    ctx.beginPath();
    ctx.moveTo(pad.left, Y(v));
    ctx.lineTo(W - pad.right, Y(v));
    ctx.stroke();
    ctx.fillText(Number(v.toPrecision(3)).toString(), pad.left - 8, Y(v) + 4);
  }
  const xStep = niceStep((t1 - t0) / 6);
  ctx.textAlign = "center";
  for (let t = Math.ceil(t0 / xStep) * xStep; t <= t1 + 1e-9; t += xStep) {
    ctx.beginPath();
    ctx.moveTo(X(t), pad.top);
    ctx.lineTo(X(t), pad.top + ph);
    ctx.stroke();
    ctx.fillText(Number(t.toPrecision(3)).toString(), X(t), pad.top + ph + 18);
  }

  // axes
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.25;
  ctx.strokeRect(pad.left, pad.top, pw, ph);
  if (lo < 0 && hi > 0) {
    ctx.strokeStyle = MUTED;
    ctx.beginPath();
    ctx.moveTo(pad.left, Y(0));
    ctx.lineTo(W - pad.right, Y(0));
    ctx.stroke();
  }

  // data
  lines.forEach((l) => {
    ctx.strokeStyle = PRINT_COLOR[l.color] ?? INK;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    series.rows.forEach((r, i) => {
      const x = X(r[tIndex] ?? 0);
      const y = Y(r[l.index] ?? 0);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // labels
  ctx.fillStyle = INK;
  ctx.font = "bold 14px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(spec.title, pad.left, 24);
  ctx.font = "12px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Time (s)", pad.left + pw / 2, H - 10);
  const unit = series.units[lines[0]?.index ?? 0] ?? "";
  ctx.save();
  ctx.translate(16, pad.top + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(unit, 0, 0);
  ctx.restore();

  // legend
  let lx = W - pad.right;
  ctx.textAlign = "right";
  for (const l of [...lines].reverse()) {
    const label = l.label;
    const w = ctx.measureText(label).width;
    ctx.fillStyle = INK;
    ctx.fillText(label, lx, 24);
    ctx.fillStyle = PRINT_COLOR[l.color] ?? INK;
    ctx.fillRect(lx - w - 24, 20, 18, 3);
    lx -= w + 40;
  }
  return canvas.toDataURL("image/png");
}
