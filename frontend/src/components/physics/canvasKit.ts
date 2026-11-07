/** Shared canvas helpers. Theme colours come from CSS tokens so both themes work. */

export function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    border: v("--border"),
    muted: v("--muted-foreground"),
    foreground: v("--foreground"),
    primary: v("--primary"),
    cyan: v("--cyan"),
    blue: v("--blue"),
    purple: v("--purple"),
    green: v("--green"),
    amber: v("--amber"),
    red: v("--red"),
    font: v("--font-body") || "sans-serif",
  };
}

export type Palette = ReturnType<typeof readPalette>;

export function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1.75,
  dashed = false,
) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length < 3) return;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - Math.cos(angle) * 5, y2 - Math.sin(angle) * 5);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(x2, y2);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-8, 3.8);
  ctx.lineTo(-8, -3.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Rounds a raw tick spacing up to 1, 2, 5 x 10^n so grid labels read cleanly. */
export function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}
