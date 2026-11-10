'use client';

import { useEffect, type RefObject } from 'react';
import { useReducedMotion } from './useReducedMotion';

const LIT = '.gw-card, .gw-stat, .gw-ach, .gw-persona-card, .gw-privacy-item';
const TOUCH_MS = 900; // a tap lights the cards around it this long

/**
 * Card borders inside `ref` light up around the pointer, the light reaching into nearby cards
 * (globals.css .gw-spotlit), in `color` (the persona's) or a default blue. A mouse or pen lights
 * them as it moves; a tap lights them briefly. Each card gets the pointer's position relative to
 * itself as --mx/--my. Off under prefers-reduced-motion.
 */
export function useSpotlight(ref: RefObject<HTMLElement | null>, color?: string) {
  const reduced = useReducedMotion();
  useEffect(() => {
    const root = ref.current;
    if (!root || reduced) return;
    root.classList.add('gw-spotlit');
    if (color) root.style.setProperty('--spot', color);
    let frame = 0, x = -1e4, y = -1e4;
    let fade: ReturnType<typeof setTimeout> | undefined;
    const paint = () => {
      for (const el of root.querySelectorAll<HTMLElement>(LIT)) {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${Math.round(x - r.left)}px`);
        el.style.setProperty('--my', `${Math.round(y - r.top)}px`);
      }
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(paint); };
    const light = (e: PointerEvent) => { x = e.clientX; y = e.clientY; root.dataset.spot = ''; schedule(); };
    const move = (e: PointerEvent) => { if (e.pointerType !== 'touch') light(e); };
    const tap = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      light(e);
      clearTimeout(fade);
      fade = setTimeout(() => { delete root.dataset.spot; }, TOUCH_MS);
    };
    const leave = (e: PointerEvent) => { if (e.pointerType !== 'touch') delete root.dataset.spot; };
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerdown', tap, { passive: true });
    root.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', schedule, { passive: true }); // cards move under a still pointer
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fade);
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerdown', tap);
      root.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', schedule);
      root.classList.remove('gw-spotlit');
      root.style.removeProperty('--spot');
      delete root.dataset.spot;
    };
  }, [ref, reduced, color]);
}
