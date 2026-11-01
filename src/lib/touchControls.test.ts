import { describe, expect, it } from "vitest";
import { assignPointer, releasePointer, stickVector, zoneFor } from "./touchControls";

describe("touch controls", () => {
  it("right half walks, left half aims — upright and sideways", () => {
    expect(zoneFor(300, 400)).toBe("move"); // upright: right half
    expect(zoneFor(100, 400)).toBe("look"); // upright: left half
    expect(zoneFor(900, 800)).toBe("move"); // sideways: right half
    expect(zoneFor(100, 800)).toBe("look"); // sideways: left half
  });
  it("both fingers work at once", () => {
    const a = assignPointer({ move: null, look: null }, 1, "move");
    const b = assignPointer(a.slots, 2, "look");
    expect(b.slots).toEqual({ move: 1, look: 2 });
  });
  it("a second finger on an occupied side is ignored, so only one stick shows", () => {
    expect(assignPointer({ move: 1, look: null }, 3, "move").role).toBeNull();
  });
  it("lifting one finger keeps the other active", () => {
    expect(releasePointer({ move: 1, look: 2 }, 1)).toEqual({ move: null, look: 2 });
    expect(releasePointer({ move: 1, look: 2 }, 2)).toEqual({ move: 1, look: null });
  });
  it("stick supports diagonal input and origin follows finger", () => {
    const r = stickVector({ x: 0, y: 0 }, { x: 200, y: 200 }, 60);
    expect(Math.hypot(r.input.x, r.input.y)).toBeCloseTo(1, 3);
    expect(r.input.x).toBeCloseTo(r.input.y, 5);
    expect(Math.hypot(r.origin.x - 200, r.origin.y - 200)).toBeCloseTo(60, 3);
  });
  it("tiny drags are a dead zone", () => {
    expect(stickVector({ x: 0, y: 0 }, { x: 3, y: 0 }, 60).input).toEqual({ x: 0, y: 0 });
  });
});
