export type Vec = { x: number; y: number };
export const WALK_SPEED = 180;
export const FAST_SPEED = 290;
export const DEAD_ZONE = 0.12;
export function analogInput(input: Vec): Vec {
  const length = Math.hypot(input.x, input.y);
  if (length <= DEAD_ZONE) return { x: 0, y: 0 };
  const strength = Math.min(1, (length - DEAD_ZONE) / (1 - DEAD_ZONE));
  return { x: input.x / length * strength, y: input.y / length * strength };
}
export function advance(position: Vec, velocity: Vec, input: Vec, fast: boolean, delta: number) {
  const dt = Math.min(Math.max(delta, 0), 0.05);
  const speed = fast ? FAST_SPEED : WALK_SPEED;
  const alpha = 1 - Math.exp(-14 * dt);
  const nextVelocity = { x: velocity.x + (input.x * speed - velocity.x) * alpha, y: velocity.y + (input.y * speed - velocity.y) * alpha };
  return { position: { x: position.x + nextVelocity.x * dt, y: position.y + nextVelocity.y * dt }, velocity: nextVelocity };
}
export function zoomAt(camera: Vec, oldZoom: number, newZoom: number, point: Vec): Vec {
  return { x: camera.x + point.x / oldZoom - point.x / newZoom, y: camera.y + point.y / oldZoom - point.y / newZoom };
}
export const MIN_SENSITIVITY = 0.4;
export const MAX_SENSITIVITY = 2;
export const DEFAULT_SENSITIVITY = 1;
export function clampSensitivity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SENSITIVITY;
  return Math.min(MAX_SENSITIVITY, Math.max(MIN_SENSITIVITY, value));
}
export function scaleInput(input: Vec, sensitivity: number): Vec {
  const factor = clampSensitivity(sensitivity);
  return { x: input.x * factor, y: input.y * factor };
}
export function turnRate(sensitivity: number): number {
  return 6 + 14 * clampSensitivity(sensitivity);
}