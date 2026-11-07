import { useCallback, useEffect, useRef } from "react";
import type { PhysicsObjectState, PhysicsState } from "@/lib/physics/engine";
import type { LiveState } from "@/lib/physics/useSimulation";
import { arrow, readPalette, type Palette } from "./canvasKit";

interface Props {
  /** Snapshot used when no live handle is given (and to trigger redraws). */
  state: PhysicsState | null;
  /** Direct per-frame feed from the engine; avoids React renders. */
  live?: LiveState;
  selectedId: number | null;
  onSelect?: (id: number | null) => void;
  onDrag?: (id: number, x: number, y: number) => void;
  onHover?: (point: { x: number; y: number } | null) => void;
  showGrid?: boolean;
  showVectors?: boolean;
  showForces?: boolean;
  showTrails?: boolean;
  /** Compact mode: smaller margins and no axis titles (used on the dashboard). */
  compact?: boolean;
  /** Disable selection and dragging. */
  interactive?: boolean;
}

const PAD_FULL = { left: 56, right: 20, top: 20, bottom: 44 };
const PAD_COMPACT = { left: 30, right: 12, top: 12, bottom: 24 };
const TRAIL_LIMIT = 500;
const FORCE_PX_PER_NEWTON = 1.2;
const FORCE_MAX_PX = 120;

type Pt = { x: number; y: number };

/** Visual viewport is independent from the fixed C++ physics boundary. */
function computeViewport(state: PhysicsState | null) {
  const bx = state?.boundaryMax.x ?? 100;
  const by = state?.boundaryMax.y ?? 60;
  let maxX = bx;
  let maxY = by;
  for (const o of state?.objects ?? []) {
    maxX = Math.max(maxX, o.pos.x + o.radius);
    maxY = Math.max(maxY, o.pos.y + o.radius);
  }
  const grow = (value: number, base: number) =>
    value <= base ? base : Math.ceil((value + 10) / 10) * 10;
  return { width: grow(maxX, bx), height: grow(maxY, by) };
}

export function WorldCanvas({
  state,
  live,
  selectedId,
  onSelect,
  onDrag,
  onHover,
  showGrid = true,
  showVectors = true,
  showForces = false,
  showTrails = true,
  compact = false,
  interactive = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const propStateRef = useRef<PhysicsState | null>(state);
  propStateRef.current = state;
  const dragRef = useRef<number | null>(null);
  const trailsRef = useRef(new Map<number, Pt[]>());
  const lastTimeRef = useRef(0);
  const frameRef = useRef(0);
  const pad = compact ? PAD_COMPACT : PAD_FULL;

  const currentState = useCallback(() => live?.stateRef.current ?? propStateRef.current, [live]);

  const projection = useCallback(() => {
    const canvas = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const view = computeViewport(currentState());
    const availW = w - pad.left - pad.right;
    const availH = h - pad.top - pad.bottom;
    const scale = Math.max(0.1, Math.min(availW / view.width, availH / view.height));
    const originX = pad.left + (availW - view.width * scale) / 2;
    const originY = pad.top + (availH + view.height * scale) / 2;
    return { scale, originX, originY, view, w, h };
  }, [currentState, pad]);

  const updateTrails = useCallback((s: PhysicsState | null) => {
    const trails = trailsRef.current;
    if (!s) {
      trails.clear();
      return;
    }
    if (s.time < lastTimeRef.current) trails.clear();
    const present = new Set(s.objects.map((o) => o.id));
    for (const id of trails.keys()) if (!present.has(id)) trails.delete(id);
    if (s.time !== lastTimeRef.current) {
      for (const o of s.objects) {
        if (o.isStatic) continue;
        const list = trails.get(o.id) ?? [];
        const prev = list[list.length - 1];
        if (!prev || Math.hypot(prev.x - o.pos.x, prev.y - o.pos.y) > 0.05) {
          list.push({ x: o.pos.x, y: o.pos.y });
          if (list.length > TRAIL_LIMIT) list.shift();
        }
        trails.set(o.id, list);
      }
    }
    lastTimeRef.current = s.time;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { scale, originX, originY, view, w, h } = projection();
    const s = currentState();
    const c = readPalette();
    updateTrails(s);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const X = (x: number) => originX + x * scale;
    const Y = (y: number) => originY - y * scale;

    // ---- grid, axes and tick labels --------------------------------------
    const stepX = view.width > 160 ? 20 : 10;
    const stepY = view.height > 120 ? 20 : 10;
    ctx.font = `${compact ? 10 : 11}px ${c.font}`;
    ctx.fillStyle = c.muted;
    if (showGrid) {
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 1;
      for (let x = 0; x <= view.width + 0.001; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(X(x) + 0.5, Y(0));
        ctx.lineTo(X(x) + 0.5, Y(view.height));
        ctx.stroke();
      }
      for (let y = 0; y <= view.height + 0.001; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(X(0), Y(y) + 0.5);
        ctx.lineTo(X(view.width), Y(y) + 0.5);
        ctx.stroke();
      }
    }
    // coordinate axes
    ctx.strokeStyle = c.muted;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(view.height));
    ctx.lineTo(X(0), Y(0));
    ctx.lineTo(X(view.width), Y(0));
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    for (let x = 0; x <= view.width + 0.001; x += stepX) ctx.fillText(String(x), X(x), Y(0) + 15);
    ctx.textAlign = "right";
    for (let y = 0; y <= view.height + 0.001; y += stepY)
      ctx.fillText(String(y), X(0) - 8, Y(y) + 4);
    if (!compact) {
      ctx.textAlign = "center";
      ctx.fillText("x (m)", X(view.width / 2), Y(0) + 33);
      ctx.save();
      ctx.translate(X(0) - 40, Y(view.height / 2));
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("y (m)", 0, 0);
      ctx.restore();
    }

    // ---- C++ physics boundary --------------------------------------------
    const bMaxX = s?.boundaryMax.x ?? 100;
    const bMaxY = s?.boundaryMax.y ?? 60;
    ctx.save();
    ctx.strokeStyle = c.primary;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.25;
    ctx.strokeRect(X(0), Y(bMaxY), bMaxX * scale, bMaxY * scale);
    ctx.restore();

    if (!s) return;

    // ---- trajectories ----------------------------------------------------
    if (showTrails) {
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      for (const [id, list] of trailsRef.current) {
        if (list.length < 2) continue;
        const o = s.objects.find((b) => b.id === id);
        ctx.strokeStyle = o ? bodyColor(o, c) : c.muted;
        ctx.globalAlpha = id === selectedId ? 0.85 : 0.45;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        list.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---- collision links -------------------------------------------------
    ctx.save();
    ctx.strokeStyle = c.red;
    ctx.lineWidth = 1.25;
    ctx.globalAlpha = 0.7;
    const colliding = new Set<number>();
    for (const col of s.recentCollisions) {
      colliding.add(col.a);
      colliding.add(col.b);
      const a = s.objects.find((o) => o.id === col.a);
      const b = s.objects.find((o) => o.id === col.b);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(X(a.pos.x), Y(a.pos.y));
      ctx.lineTo(X(b.pos.x), Y(b.pos.y));
      ctx.stroke();
    }
    ctx.restore();

    // ---- bodies ----------------------------------------------------------
    for (const o of s.objects) {
      const cx = X(o.pos.x);
      const cy = Y(o.pos.y);
      const selected = o.id === selectedId;
      const hit = colliding.has(o.id);
      const color = bodyColor(o, c);

      ctx.save();
      ctx.lineWidth = selected ? 2.25 : 1.5;
      ctx.strokeStyle = hit ? c.red : color;
      ctx.fillStyle = color;
      ctx.globalAlpha = o.isStatic ? 0.18 : 0.26;
      ctx.beginPath();
      if (o.shape === "Circle") {
        ctx.arc(cx, cy, (o.shapeParams[0] ?? o.radius) * scale, 0, Math.PI * 2);
      } else if (o.shape === "Rectangle") {
        const wpx = (o.shapeParams[0] ?? 2) * scale;
        const hpx = (o.shapeParams[1] ?? 2) * scale;
        ctx.rect(cx - wpx / 2, cy - hpx / 2, wpx, hpx);
      } else {
        const bpx = (o.shapeParams[0] ?? 2) * scale;
        const hpx = (o.shapeParams[1] ?? 2) * scale;
        ctx.moveTo(cx, cy - hpx / 2);
        ctx.lineTo(cx + bpx / 2, cy + hpx / 2);
        ctx.lineTo(cx - bpx / 2, cy + hpx / 2);
        ctx.closePath();
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.restore();

      if (selected) {
        ctx.save();
        ctx.strokeStyle = c.foreground;
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(o.radius * scale + 7, 14), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // velocity vectors: components (dashed) and resultant
      if (showVectors && !o.isStatic) {
        const vx = o.vel.x * scale * 0.5;
        const vy = o.vel.y * scale * 0.5;
        arrow(ctx, cx, cy, cx + vx, cy, c.blue, 1.25, true);
        arrow(ctx, cx, cy, cx, cy - vy, c.purple, 1.25, true);
        arrow(ctx, cx, cy, cx + vx, cy - vy, c.green, 2);
        if (selected && Math.hypot(vx, vy) > 14) {
          ctx.save();
          ctx.fillStyle = c.green;
          ctx.font = `600 11px ${c.font}`;
          ctx.textAlign = "left";
          ctx.fillText("v", cx + vx + 7, cy - vy - 6);
          ctx.restore();
        }
      }

      // net force F = m·a, using the acceleration reported by the C++ engine
      if (showForces && !o.isStatic) {
        const fx = o.mass * o.acc.x;
        const fy = o.mass * o.acc.y;
        const mag = Math.hypot(fx, fy);
        if (mag > 1e-6) {
          const len = Math.min(FORCE_MAX_PX, mag * FORCE_PX_PER_NEWTON);
          const ex = cx + (fx / mag) * len;
          const ey = cy - (fy / mag) * len;
          arrow(ctx, cx, cy, ex, ey, c.amber, 2.25);
          if (selected) {
            ctx.save();
            ctx.fillStyle = c.amber;
            ctx.font = `600 11px ${c.font}`;
            ctx.textAlign = "left";
            ctx.fillText(`ΣF ${mag.toFixed(1)} N`, ex + 8, ey + 4);
            ctx.restore();
          }
        }
      }

      if (!compact) {
        ctx.save();
        ctx.fillStyle = selected ? c.foreground : c.muted;
        ctx.font = `${selected ? 600 : 500} 11px ${c.font}`;
        ctx.textAlign = "center";
        ctx.fillText(`#${o.id}`, cx, cy - Math.max(o.radius * scale, 8) - 8);
        ctx.restore();
      }
    }
  }, [
    compact,
    currentState,
    projection,
    selectedId,
    showForces,
    showGrid,
    showTrails,
    showVectors,
    updateTrails,
  ]);

  // Coalesce redraw requests into at most one per animation frame.
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

  useEffect(() => {
    if (!live) return;
    return live.subscribe(schedule);
  }, [live, schedule]);

  useEffect(() => {
    schedule();
  }, [schedule, state, draw]);

  const toWorld = (event: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { scale, originX, originY } = projection();
    return {
      x: (event.clientX - rect.left - originX) / scale,
      y: (originY - (event.clientY - rect.top)) / scale,
    };
  };

  const pick = (p: Pt): number | null => {
    const s = currentState();
    if (!s) return null;
    let picked: number | null = null;
    let best = Infinity;
    for (const o of s.objects) {
      const d = Math.hypot(o.pos.x - p.x, o.pos.y - p.y);
      if (d <= Math.max(o.radius, 1.5) && d < best) {
        best = d;
        picked = o.id;
      }
    }
    return picked;
  };

  const handleDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const picked = pick(toWorld(event));
    onSelect?.(picked);
    if (picked !== null) {
      dragRef.current = picked;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handleMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toWorld(event);
    if (dragRef.current !== null) {
      onDrag?.(dragRef.current, p.x, p.y);
      return;
    }
    onHover?.(p);
    event.currentTarget.style.cursor = pick(p) !== null ? "grab" : "crosshair";
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        role="img"
        aria-label="Physics simulation canvas"
        {...(interactive
          ? {
              onPointerDown: handleDown,
              onPointerMove: handleMove,
              onPointerUp: endDrag,
              onPointerCancel: endDrag,
              onPointerLeave: () => onHover?.(null),
            }
          : {})}
      />
    </div>
  );
}

function bodyColor(o: PhysicsObjectState, c: Palette): string {
  if (o.isStatic) return c.muted;
  if (o.shape === "Circle") return c.cyan;
  if (o.shape === "Rectangle") return c.blue;
  return c.purple;
}
