// PUBG-style split screen: a finger that lands on the left half walks, a finger on the right half aims the camera.
// Each side is owned by one pointer id, so lifting one finger never resets the other.
export type Slots = { move: number | null; look: number | null };
export type Role = "move" | "look";

export function zoneFor(x: number, width: number): Role {
  return x < width * 0.5 ? "move" : "look";
}

export function assignPointer(slots: Slots, id: number, zone: Role): { slots: Slots; role: Role | null } {
  if (slots.move === id) return { slots, role: "move" };
  if (slots.look === id) return { slots, role: "look" };
  if (slots[zone] !== null) return { slots, role: null };
  return { slots: { ...slots, [zone]: id }, role: zone };
}

export function releasePointer(slots: Slots, id: number): Slots {
  return { move: slots.move === id ? null : slots.move, look: slots.look === id ? null : slots.look };
}

/** Floating stick: origin follows the finger once it passes the radius, so the stick is never pinned to a screen spot. */
export function stickVector(origin: { x: number; y: number }, finger: { x: number; y: number }, radius: number, dead = 0.12) {
  let dx = finger.x - origin.x, dy = finger.y - origin.y;
  const d = Math.hypot(dx, dy);
  let o = origin;
  if (d > radius) { const k = (d - radius) / d; o = { x: origin.x + dx * k, y: origin.y + dy * k }; dx = finger.x - o.x; dy = finger.y - o.y; }
  const m = Math.min(1, Math.hypot(dx, dy) / radius);
  if (m < dead) return { origin: o, input: { x: 0, y: 0 }, knob: { x: dx, y: dy } };
  const scale = (m - dead) / (1 - dead) / (m || 1);
  return { origin: o, input: { x: (dx / radius) * scale, y: (dy / radius) * scale }, knob: { x: dx, y: dy } };
}
