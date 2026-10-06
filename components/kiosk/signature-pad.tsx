"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Eraser, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number; t: number };
type Stroke = Point[];

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  /** PNG blob — ready to upload to private object storage (Cloudflare R2). */
  toBlob: () => Promise<Blob | null>;
  toDataURL: () => string | null;
}

interface SignaturePadProps {
  ref?: Ref<SignaturePadHandle>;
  onInkChange?: (hasInk: boolean) => void;
  label?: string;
  className?: string;
  ink?: string;
}

/**
 * Canvas signature pad (mouse, touch and pen via Pointer Events).
 *
 * Strokes live only in component memory. Nothing is written to
 * localStorage; the parent exports a Blob on confirm and hands it to
 * the storage service (mocked in Phase 1, R2 upload in Phase 2).
 * Strokes are kept as vectors so the canvas re-renders crisply when
 * the tablet rotates or the container resizes.
 */
export function SignaturePad({ ref, onInkChange, label = "Signature area", className, ink = "#0f1b3d" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const setInk = useCallback(
    (value: boolean) => {
      setHasInk(value);
      onInkChange?.(value);
    },
    [onInkChange],
  );

  const drawStroke = useCallback(
    (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      if (stroke.length === 0) return;
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      for (let i = 1; i < stroke.length; i++) {
        const p0 = stroke[i - 1];
        const p1 = stroke[i];
        // Slightly thinner lines when moving fast, like real ink.
        const speed = Math.hypot(p1.x - p0.x, p1.y - p0.y) / Math.max(1, p1.t - p0.t);
        ctx.lineWidth = Math.max(1.6, Math.min(3.4, 3.6 - speed * 0.9));
        const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        ctx.beginPath();
        if (i === 1) ctx.moveTo(p0.x, p0.y);
        else {
          const prev = stroke[i - 2];
          ctx.moveTo((prev.x + p0.x) / 2, (prev.y + p0.y) / 2);
        }
        ctx.quadraticCurveTo(p0.x, p0.y, mid.x, mid.y);
        ctx.stroke();
      }
    },
    [ink],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.current.forEach((s) => drawStroke(ctx, s));
  }, [drawStroke]);

  // Keep the backing store sized to the element (crisp on retina, survives rotation).
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = wrap.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    strokes.current.push([pointFrom(e)]);
    redraw();
    if (!hasInk) setInk(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const stroke = strokes.current[strokes.current.length - 1];
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    const rect = e.currentTarget.getBoundingClientRect();
    for (const ev of events) stroke.push({ x: ev.clientX - rect.left, y: ev.clientY - rect.top, t: ev.timeStamp });
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawStroke(ctx, stroke.slice(-events.length - 2));
  };

  const endStroke = () => {
    drawing.current = false;
  };

  const clear = useCallback(() => {
    strokes.current = [];
    redraw();
    setInk(false);
  }, [redraw, setInk]);

  useImperativeHandle(
    ref,
    () => ({
      clear,
      isEmpty: () => strokes.current.length === 0,
      toDataURL: () => (strokes.current.length ? (canvasRef.current?.toDataURL("image/png") ?? null) : null),
      toBlob: () =>
        new Promise<Blob | null>((resolve) => {
          if (!canvasRef.current || strokes.current.length === 0) return resolve(null);
          canvasRef.current.toBlob((b) => resolve(b), "image/png");
        }),
    }),
    [clear],
  );

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border-2 border-dashed border-line-strong bg-surface", className)}>
      <div ref={wrapRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${label}. ${hasInk ? "Signature captured." : "Empty — sign with your finger, stylus or mouse."}`}
          className="block touch-none cursor-crosshair select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
        />
      </div>
      {!hasInk && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-subtle">
          <PenLine className="size-8" aria-hidden="true" />
          <span className="text-lg font-semibold">Sign here</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-8 bottom-10 border-b-2 border-line" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-3 left-8 text-xs font-bold tracking-wide text-ink-subtle uppercase" aria-hidden="true">
        Signature
      </span>
      <button
        type="button"
        onClick={clear}
        disabled={!hasInk}
        className="absolute top-3 right-3 inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink shadow-soft transition-opacity hover:bg-muted disabled:opacity-40"
      >
        <Eraser className="size-4" aria-hidden="true" /> Clear
      </button>
    </div>
  );
}
