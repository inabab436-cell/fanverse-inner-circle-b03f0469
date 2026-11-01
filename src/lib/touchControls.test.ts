import { describe, expect, it } from "vitest";
import { assignPointer, releasePointer, stickVector } from "./touchControls";

describe("touch controls", () => {
  it("first finger moves, second finger looks", () => {
    const a = assignPointer({ move: null, look: null }, 1);
    const b = assignPointer(a.slots, 2);
    expect(a.role).toBe("move");
    expect(b.role).toBe("look");
  });
  it("lifting the move finger keeps the look finger active", () => {
    const s = releasePointer({ move: 1, look: 2 }, 1);
    expect(s).toEqual({ move: null, look: 2 });
    expect(assignPointer(s, 3).role).toBe("move");
  });
  it("lifting the look finger keeps movement active", () => {
    expect(releasePointer({ move: 1, look: 2 }, 2)).toEqual({ move: 1, look: null });
  });
  it("third finger is ignored", () => {
    expect(assignPointer({ move: 1, look: 2 }, 3).role).toBeNull();
  });
  it("stick supports diagonal and full 360 input, origin follows finger", () => {
    const r = stickVector({ x: 0, y: 0 }, { x: 200, y: 200 }, 60);
    expect(Math.hypot(r.input.x, r.input.y)).toBeCloseTo(1, 3);
    expect(r.input.x).toBeCloseTo(r.input.y, 5);
    expect(Math.hypot(r.origin.x - 200, r.origin.y - 200)).toBeCloseTo(60, 3);
  });
  it("tiny drags are a dead zone", () => {
    expect(stickVector({ x: 0, y: 0 }, { x: 3, y: 0 }, 60).input).toEqual({ x: 0, y: 0 });
  });
});
