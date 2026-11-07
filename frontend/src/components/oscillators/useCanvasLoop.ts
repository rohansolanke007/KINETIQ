import { useCallback, useEffect, useRef } from "react";
import type { LiveFeed } from "@/lib/physics/useSimModule";

/**
 * Shared canvas plumbing: DPR-aware resizing, per-frame redraw on the live
 * feed, and redraw when React props change. `draw` receives the context and
 * CSS-pixel size.
 */
export function useCanvasLoop<S>(
  live: LiveFeed<S>,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef(0);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    draw(ctx, canvas.width / dpr, canvas.height / dpr);
  }, [draw]);

  const paintRef = useRef(paint);
  paintRef.current = paint;
  const schedule = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      paintRef.current();
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
      paintRef.current();
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
  }, [schedule, paint]);

  return { canvasRef, wrapRef };
}
