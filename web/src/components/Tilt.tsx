'use client';

import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Tilts its content toward the pointer with a glare that follows it, like a card in the hand.
 * A mouse or pen tilts it on hover; with `touch`, so does a finger dragged sideways across it
 * (vertical drags still scroll the page). Descendants get --gx/--gy (0–100%) and --fx (0–1) for
 * effects that follow the tilt, such as PixelFoil. Off under prefers-reduced-motion.
 * `shape` clips the glare: 'orbit' to a badge inside its orbit ring, 'badge' to a bare badge,
 * 'rect' to the box's rounded corners.
 */
export function Tilt({ children, shape = 'rect', max = 10, touch = false, className, style }: {
  children: ReactNode; shape?: 'orbit' | 'badge' | 'rect'; max?: number; touch?: boolean; className?: string; style?: CSSProperties;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const dragging = useRef<number | null>(null); // the touch pointer tilting it

  const tilt = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const s = el.style;
      s.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
      s.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
      s.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      s.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
      s.setProperty('--fx', ((x + y) / 2).toFixed(3));
      el.dataset.tilting = '';
    });
  };
  const rest = () => {
    cancelAnimationFrame(frame.current);
    dragging.current = null;
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    delete el.dataset.tilting;
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || !touch || e.pointerType !== 'touch') return;
    dragging.current = e.pointerId;
    tilt(e.clientX, e.clientY);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    if (e.pointerType === 'touch' ? dragging.current === e.pointerId : true) tilt(e.clientX, e.clientY);
  };
  const end = (e: PointerEvent<HTMLDivElement>) => { if (e.pointerType !== 'touch' || dragging.current === e.pointerId) rest(); };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div
      ref={ref}
      className={`gw-tilt gw-tilt-${shape} ${touch ? 'gw-tilt-touch' : ''} ${className ?? ''}`}
      style={style}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
    >
      <div className="gw-tilt-inner">
        {children}
        <div className="gw-tilt-glare" aria-hidden="true" />
      </div>
    </div>
  );
}
