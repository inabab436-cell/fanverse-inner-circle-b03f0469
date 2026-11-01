import { describe, expect, it } from "vitest";
import { advance, analogInput, clampSensitivity, scaleInput, turnRate, zoomAt } from "./movement";

describe("social walking", () => {
  it("ignores small thumb drift", () => { expect(analogInput({ x: 0.08, y: 0 })).toEqual({ x: 0, y: 0 }); });
  it("keeps diagonals at the same maximum speed", () => { expect(Math.hypot(...Object.values(analogInput({ x: 1, y: 1 })))).toBeCloseTo(1); });
  it("moves in the intended direction and faster when fast walking", () => {
    const walk = advance({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, false, 0.016);
    const fast = advance({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, true, 0.016);
    expect(walk.position.x).toBeGreaterThan(0); expect(walk.position.y).toBe(0); expect(fast.position.x).toBeGreaterThan(walk.position.x);
  });
  it("brakes when the thumb is released", () => { expect(advance({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 0 }, false, 0.016).velocity.x).toBeLessThan(100); });
  it("prevents a jump after the browser is backgrounded", () => { expect(advance({ x: 0, y: 0 }, { x: 180, y: 0 }, { x: 1, y: 0 }, false, 10).position.x).toBe(9); });
  it("keeps the point under the cursor stable while zooming", () => {
    const camera = zoomAt({ x: 10, y: 20 }, 1, 2, { x: 100, y: 80 });
    expect((110 - camera.x) * 2).toBe(100); expect((100 - camera.y) * 2).toBe(80);
  });
  it("leaves a light drag still at low sensitivity but walks it at high sensitivity", () => {
    expect(analogInput(scaleInput({ x: 0.2, y: 0 }, 0.4))).toEqual({ x: 0, y: 0 });
    expect(analogInput(scaleInput({ x: 0.2, y: 0 }, 2)).x).toBeGreaterThan(0);
  });
  it("keeps the sensitivity slider inside its limits", () => {
    expect(clampSensitivity(9)).toBe(2); expect(clampSensitivity(0)).toBe(0.4); expect(clampSensitivity(Number.NaN)).toBe(1);
  });
  it("turns toward the drag faster the higher the sensitivity", () => {
    expect(turnRate(2)).toBeGreaterThan(turnRate(0.4));
    expect(scaleInput({ x: 1, y: 0 }, 0.5)).toEqual({ x: 0.5, y: 0 });
  });
});