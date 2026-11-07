import { SPRITE } from '../sprites';
import { ease } from './geometry';

/*
 Möwe Piet: Er kreist um den Kopf der Nordhexe und gleitet ab und zu auf ihre Schulter.
 Reine Rechnung aus Fußpunkt, Zeit und Haltung der Figur, damit sie testbar bleibt.
*/

/** Piets Tageslauf in Millisekunden: sitzen, abheben, kreisen, landen. */
export const PIET_CYCLE = 9000;
export const PIET_SIT = 2600;
export const PIET_GLIDE = 700;

export interface Foot { x: number; y: number; s: number }
export interface Pose { flip: boolean; side?: number; bob?: number }

/**
 * foot: Bildschirmpunkt der Füße und Feldgröße s; t: Zeit in ms; pose: Blickrichtung,
 * Schulterseite (-1 links, 1 rechts, dazwischen beim Wechsel) und Wippen der Figur in Sprite-Pixeln.
 */
export function pietPosition(foot: Foot, t: number, pose: Pose) {
  const f = foot, size = f.s * 0.55;
  const ph = ((t % PIET_CYCLE) + PIET_CYCLE) % PIET_CYCLE, a = t / 520;
  const orbit = { x: f.x + Math.cos(a) * f.s * 0.42, y: f.y - f.s * (1.25 + Math.sin(a) * 0.1) };
  const px = (f.s * 1.2) / SPRITE;
  const seat = {
    x: f.x + f.s * 0.3 * (pose.side ?? (pose.flip ? -1 : 1)),
    y: f.y - f.s * 0.78 - Math.cos((pose.side ?? 1) * Math.PI / 2) * f.s * 0.12 + (pose.bob ?? 0) * px,
  };
  let w = 0, landing = false;
  if (ph < PIET_SIT) w = 1;
  else if (ph < PIET_SIT + PIET_GLIDE) w = 1 - ease((ph - PIET_SIT) / PIET_GLIDE);
  else if (ph > PIET_CYCLE - PIET_GLIDE) { w = ease((ph - PIET_CYCLE + PIET_GLIDE) / PIET_GLIDE); landing = true; }
  const hop = Math.sin(w * Math.PI) * f.s * 0.18;
  let flip = Math.sin(a) > 0;
  if (w === 1) flip = pose.flip;
  else if (w > 0) flip = landing ? seat.x < orbit.x : orbit.x < seat.x;
  return {
    x: orbit.x + (seat.x - orbit.x) * w,
    y: orbit.y + (seat.y - orbit.y) * w - hop,
    size, flip, frame: w === 1 ? 0 : Math.floor(t / 120), sitting: w === 1,
  };
}
