import { useCallback, useEffect, useRef } from "react";
import type { PhysicsState } from "@/lib/physics/engine";

interface Props {
  state: PhysicsState | null;
  selectedId: number | null;
  onSelect?: (id: number | null) => void;
  onDrag?: (id: number, x: number, y: number) => void;
  showGrid?: boolean;
  showVectors?: boolean;
}

const PAD = 44; // device-independent padding inside the board, in px
const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Visual viewport is independent from the fixed C++ physics boundary. */
export function computeViewport(state: PhysicsState | null) {
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
  selectedId,
  onSelect,
  onDrag,
  showGrid = true,
  showVectors = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(state);
  const dragRef = useRef<number | null>(null);
  stateRef.current = state;

  const projection = useCallback(() => {
    const canvas = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const view = computeViewport(stateRef.current);
    const scale = Math.min((w - PAD * 2) / view.width, (h - PAD * 2) / view.height);
    const originX = (w - view.width * scale) / 2;
    const originY = (h - PAD) ;
    return { scale, originX, originY, view, w, h };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { scale, originX, originY, view, w, h } = projection();
    const s = stateRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const X = (x: number) => originX + x * scale;
    const Y = (y: number) => originY - y * scale;

    const line = css("--border") || "rgba(255,255,255,.12)";
    const muted = css("--muted-foreground");
    const amber = css("--amber");

    // grid
    if (showGrid) {
      ctx.lineWidth = 1;
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillStyle = muted;
      const stepX = view.width > 160 ? 20 : 10;
      const stepY = view.height > 120 ? 20 : 10;
      ctx.strokeStyle = line;
      for (let x = 0; x <= view.width + 0.001; x += stepX) {
        ctx.globalAlpha = x === 0 ? 0.75 : 0.35;
        ctx.beginPath();
        ctx.moveTo(X(x), Y(0));
        ctx.lineTo(X(x), Y(view.height));
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.textAlign = "center";
        ctx.fillText(String(x), X(x), Y(0) + 15);
      }
      for (let y = 0; y <= view.height + 0.001; y += stepY) {
        ctx.globalAlpha = y === 0 ? 0.75 : 0.35;
        ctx.beginPath();
        ctx.moveTo(X(0), Y(y));
        ctx.lineTo(X(view.width), Y(y));
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.textAlign = "right";
        ctx.fillText(String(y), X(0) - 8, Y(y) + 3);
      }
      ctx.globalAlpha = 1;
    }

    // C++ physics boundary
    const bMaxX = s?.boundaryMax.x ?? 100;
    const bMaxY = s?.boundaryMax.y ?? 60;
    ctx.save();
    ctx.strokeStyle = amber;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(X(0), Y(bMaxY), bMaxX * scale, bMaxY * scale);
    ctx.restore();

    if (!s) return;

    const colliding = new Set<number>();
    for (const c of s.recentCollisions) {
      colliding.add(c.a);
      colliding.add(c.b);
    }

    // collision links
    ctx.save();
    ctx.strokeStyle = css("--red");
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.7;
    for (const c of s.recentCollisions) {
      const a = s.objects.find((o) => o.id === c.a);
      const b = s.objects.find((o) => o.id === c.b);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(X(a.pos.x), Y(a.pos.y));
      ctx.lineTo(X(b.pos.x), Y(b.pos.y));
      ctx.stroke();
    }
    ctx.restore();

    for (const o of s.objects) {
      const cx = X(o.pos.x);
      const cy = Y(o.pos.y);
      const selected = o.id === selectedId;
      const hit = colliding.has(o.id);
      const color = o.isStatic
        ? css("--muted-foreground")
        : o.shape === "Circle"
          ? css("--amber")
          : o.shape === "Rectangle"
            ? css("--blue")
            : css("--purple");

      ctx.save();
      ctx.lineWidth = selected ? 2 : 1.4;
      ctx.strokeStyle = hit ? css("--red") : color;
      ctx.fillStyle = color;
      ctx.globalAlpha = o.isStatic ? 0.16 : 0.22;
      if (selected || hit) {
        ctx.shadowColor = hit ? css("--red") : color;
        ctx.shadowBlur = 18;
      }

      ctx.beginPath();
      if (o.shape === "Circle") {
        const r = (o.shapeParams[0] ?? o.radius) * scale;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
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

      // selection ring
      if (selected) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(o.radius * scale + 8, 14), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // velocity vector
      if (showVectors && !o.isStatic) {
        const vx = o.vel.x * scale * 0.5;
        const vy = o.vel.y * scale * 0.5;
        if (Math.hypot(vx, vy) > 3) {
          ctx.save();
          ctx.strokeStyle = css("--green");
          ctx.fillStyle = css("--green");
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + vx, cy - vy);
          ctx.stroke();
          const angle = Math.atan2(-vy, vx);
          ctx.translate(cx + vx, cy - vy);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-7, 3.5);
          ctx.lineTo(-7, -3.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // id label
      ctx.save();
      ctx.fillStyle = selected ? color : muted;
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`#${o.id}`, cx, cy - Math.max(o.radius * scale, 8) - 8);
      ctx.restore();
    }
  }, [projection, selectedId, showGrid, showVectors]);

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
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw, state]);

  const toWorld = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const { scale, originX, originY } = projection();
    return {
      x: (event.clientX - rect.left - originX) / scale,
      y: (originY - (event.clientY - rect.top)) / scale,
    };
  };

  const handleDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (!s) return;
    const p = toWorld(event);
    let picked: number | null = null;
    let bestDistance = Infinity;
    for (const o of s.objects) {
      const d = Math.hypot(o.pos.x - p.x, o.pos.y - p.y);
      if (d <= Math.max(o.radius, 1.5) && d < bestDistance) {
        bestDistance = d;
        picked = o.id;
      }
    }
    onSelect?.(picked);
    if (picked !== null) {
      dragRef.current = picked;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handleMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current === null) return;
    const p = toWorld(event);
    onDrag?.(dragRef.current, p.x, p.y);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
    </div>
  );
}
