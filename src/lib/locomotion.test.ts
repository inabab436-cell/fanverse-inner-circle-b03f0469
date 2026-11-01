import { describe, expect, it } from "vitest";
import { boneRegion, clipRate, pickClip, type LocoState } from "./locomotion";

const base: LocoState = { speed: 0, airborne: false, vy: 0, sitting: "no", turnGap: 0 };

describe("pickClip", () => {
  it("stands still at zero speed", () => expect(pickClip(base)).toBe("idle"));
  it("walks at walking speed", () => expect(pickClip({ ...base, speed: 1 })).toBe("walk"));
  it("runs when fast", () => expect(pickClip({ ...base, speed: 1.8 })).toBe("run"));
  it("steps to turn when the camera swings away", () => expect(pickClip({ ...base, turnGap: 1 })).toBe("turn"));
  it("jumps then falls in the air", () => {
    expect(pickClip({ ...base, airborne: true, vy: 3 })).toBe("jump");
    expect(pickClip({ ...base, airborne: true, vy: -1 })).toBe("fall");
  });
  it("sitting overrides movement", () => expect(pickClip({ ...base, speed: 2, sitting: "yes" })).toBe("sit"));
});

describe("clipRate", () => {
  it("matches walk playback to ground speed", () => expect(clipRate("walk", 1.25)).toBeCloseTo(1));
  it("slows the walk for a slow push", () => expect(clipRate("walk", 0.3)).toBe(0.5));
});

describe("boneRegion", () => {
  it("dresses the chest and upper arms in the tee", () => {
    expect(boneRegion("spine_03")).toBe("tee");
    expect(boneRegion("upperarm_l")).toBe("tee");
  });
  it("leaves forearms, hands and head as skin", () => {
    expect(boneRegion("lowerarm_r")).toBe("skin");
    expect(boneRegion("Head")).toBe("skin");
  });
  it("legs are jeans and feet are sneakers", () => {
    expect(boneRegion("calf_l")).toBe("jeans");
    expect(boneRegion("foot_r")).toBe("shoes");
  });
});
