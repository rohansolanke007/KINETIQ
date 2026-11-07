import { useCallback, useEffect, useRef } from "react";
import type { ProjectileInfo, ProjectileState } from "@/lib/physics/engine";
import type { LiveFeed } from "@/lib/physics/useSimModule";
import { arrow, niceStep, readPalette } from "@/components/physics/canvasKit";

interface Props {
  info: ProjectileInfo | null;
  state: ProjectileState | null;
  live: LiveFeed<ProjectileState>;
  showVectors: boolean;
  showPrediction: boolean;
}

const PAD = { left: 60, right: 24, top: 24, bottom: 48 };

/**
 * Draws the projectile experiment. Every number comes from C++ (the
 * predicted path, the analytic H / R, the live position and velocity); the
 * canvas only converts metres to pixels.
 */
export function TrajectoryCanvas({ info, state, live, showVectors, showPrediction }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<[number, number][]>([]);
  const lastTimeRef = useRef(-1);
  const frameRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const c = readPalette();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!info) return;

    const a = info.analytic;
    const live_ = live.stateRef.current ?? state;

    // ---- travelled path (reset whenever the clock goes backwards) --------
    const trail = trailRef.current;
    if (live_) {
      if (live_.time < lastTimeRef.current) trail.length = 0;
      if (live_.time !== lastTimeRef.current || trail.length === 0) {
        trail.push([live_.position.x, live_.position.y]);
        if (trail.length > 4000) trail.shift();
      }
      lastTimeRef.current = live_.time;
    }

    // ---- viewport: equal metres-per-pixel on both axes -------------------
    const worldW = Math.max(a.range * 1.1, 12);
    const worldH = Math.max(a.maxHeight * 1.3, 8);
    const availW = w - PAD.left - PAD.right;
    const availH = h - PAD.top - PAD.bottom;
    const scale = Math.max(0.01, Math.min(availW / worldW, availH / worldH));
    const originX = PAD.left + (availW - worldW * scale) / 2;
    const originY = PAD.top + (availH + worldH * scale) / 2;
    const X = (x: number) => originX + x * scale;
    const Y = (y: number) => originY - y * scale;

    // ---- grid and axes ---------------------------------------------------
    const step = niceStep(Math.max(worldW, worldH) / 8);
    ctx.font = `11px ${c.font}`;
    ctx.lineWidth = 1;
    ctx.strokeStyle = c.border;
    ctx.fillStyle = c.muted;
    ctx.textAlign = "center";
    for (let x = 0; x <= worldW + 1e-9; x += step) {
      ctx.beginPath();
      ctx.moveTo(X(x) + 0.5, Y(0));
      ctx.lineTo(X(x) + 0.5, Y(worldH));
      ctx.stroke();
      ctx.fillText(String(Math.round(x * 100) / 100), X(x), Y(0) + 16);
    }
    ctx.textAlign = "right";
    for (let y = 0; y <= worldH + 1e-9; y += step) {
      ctx.beginPath();
      ctx.moveTo(X(0), Y(y) + 0.5);
      ctx.lineTo(X(worldW), Y(y) + 0.5);
      ctx.stroke();
      ctx.fillText(String(Math.round(y * 100) / 100), X(0) - 8, Y(y) + 4);
    }
    ctx.textAlign = "center";
    ctx.fillText("x (m)", X(worldW / 2), Y(0) + 36);
    ctx.save();
    ctx.translate(X(0) - 44, Y(worldH / 2));
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("y (m)", 0, 0);
    ctx.restore();

    ctx.strokeStyle = c.muted;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(worldH));
    ctx.lineTo(X(0), Y(0));
    ctx.lineTo(X(worldW), Y(0));
    ctx.stroke();
    ctx.globalAlpha = 1;

    const h0 = info.parameters.find((p) => p.name === "height")?.value ?? 0;

    // launch platform when launching from a height
    if (h0 > 0) {
      ctx.fillStyle = c.muted;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(X(-0.6) - 6, Y(h0), 12 + 0.6 * scale, h0 * scale);
      ctx.globalAlpha = 1;
    }

    // ---- analytic annotations: apex height H and range R ------------------
    const apexX = a.ux * a.apexTime;
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = c.amber;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;
    if (a.maxHeight > 0) {
      ctx.beginPath();
      ctx.moveTo(X(0), Y(a.maxHeight));
      ctx.lineTo(X(apexX), Y(a.maxHeight));
      ctx.lineTo(X(apexX), Y(0));
      ctx.stroke();
    }
    if (a.range > 0) {
      ctx.beginPath();
      ctx.moveTo(X(a.range), Y(0));
      ctx.lineTo(X(a.range), Y(Math.min(worldH * 0.25, a.maxHeight)));
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = c.amber;
    ctx.font = `600 11.5px ${c.font}`;
    ctx.textAlign = "left";
    if (a.maxHeight > 0)
      ctx.fillText(`H = ${a.maxHeight.toFixed(2)} m`, X(0) + 8, Y(a.maxHeight) - 6);
    if (a.range > 0) {
      ctx.textAlign = "center";
      // label sits at the top of the range marker, clear of the landing path
      ctx.fillText(
        `R = ${a.range.toFixed(2)} m`,
        X(a.range),
        Y(Math.min(worldH * 0.25, a.maxHeight)) - 8,
      );
    }

    // ---- predicted path (from C++) ---------------------------------------
    if (showPrediction && info.predictedPath.length > 1) {
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = c.muted;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      info.predictedPath.forEach(([x, y], i) =>
        i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)),
      );
      ctx.stroke();
      ctx.restore();
    }

    // ---- travelled path ---------------------------------------------------
    if (trail.length > 1) {
      ctx.save();
      ctx.strokeStyle = c.cyan;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      trail.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.stroke();
      ctx.restore();
    }

    // ---- launch angle -----------------------------------------------------
    const angleDeg = info.parameters.find((p) => p.name === "angle")?.value ?? 0;
    const speed0 = info.parameters.find((p) => p.name === "speed")?.value ?? 0;
    if (speed0 > 0) {
      const theta = (angleDeg * Math.PI) / 180;
      ctx.save();
      ctx.strokeStyle = c.muted;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(X(0), Y(h0), 34, 0, -theta, true);
      ctx.stroke();
      ctx.fillStyle = c.foreground;
      ctx.font = `500 11.5px ${c.font}`;
      ctx.textAlign = "left";
      ctx.fillText(`θ = ${angleDeg.toFixed(1)}°`, X(0) + 40, Y(h0) - 6 - 8 * Math.sin(theta));
      ctx.restore();
    }

    // ---- apex and impact markers -------------------------------------------
    ctx.save();
    ctx.strokeStyle = c.amber;
    ctx.lineWidth = 1.5;
    if (a.maxHeight > h0 + 1e-9) {
      ctx.beginPath();
      ctx.arc(X(apexX), Y(a.maxHeight), 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (a.range > 0) {
      ctx.beginPath();
      ctx.arc(X(a.range), Y(0), 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // ---- the projectile and its velocity vectors --------------------------
    if (live_) {
      const px = X(live_.position.x);
      const py = Y(live_.position.y);
      if (showVectors && !live_.finished) {
        const k = 70 / Math.max(speed0, 1); // px per (m/s): launch vector is 70 px
        const vx = live_.velocity.x * k;
        const vy = live_.velocity.y * k;
        arrow(ctx, px, py, px + vx, py, c.blue, 1.5, true);
        arrow(ctx, px, py, px, py - vy, c.purple, 1.5, true);
        arrow(ctx, px, py, px + vx, py - vy, c.green, 2.25);
        ctx.font = `600 11px ${c.font}`;
        ctx.textAlign = "left";
        ctx.fillStyle = c.blue;
        if (Math.abs(vx) > 18) ctx.fillText("vx", px + vx / 2 - 6, py + 14);
        ctx.fillStyle = c.purple;
        if (Math.abs(vy) > 18) ctx.fillText("vy", px + 6, py - vy / 2);
        ctx.fillStyle = c.green;
        ctx.fillText("v", px + vx + 7, py - vy - 5);
      }
      ctx.save();
      ctx.fillStyle = c.cyan;
      ctx.strokeStyle = c.foreground;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }, [info, state, live, showVectors, showPrediction]);

  const drawRef = useRef(draw);
  drawRef.current = draw;
  const schedule = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      drawRef.current();
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      drawRef.current();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, []);

  useEffect(() => live.subscribe(schedule), [live, schedule]);
  useEffect(() => {
    schedule();
  }, [schedule, draw]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        role="img"
        aria-label="Projectile trajectory"
      />
    </div>
  );
}
