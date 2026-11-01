/** Pure animation rules for the humanoid avatars (metres, seconds). */
export type Clip = "idle" | "walk" | "run" | "turn" | "jump" | "fall" | "land" | "sitDown" | "sit" | "standUp";

/** Clip names inside the Universal Animation Library file. */
export const CLIP_FILE: Record<Clip, string> = {
  idle: "Idle_Loop", walk: "Walk_Loop", run: "Jog_Fwd_Loop", turn: "Walk_Loop",
  jump: "Jump_Start", fall: "Jump_Loop", land: "Jump_Land",
  sitDown: "Sitting_Enter", sit: "Sitting_Idle_Loop", standUp: "Sitting_Exit",
};

export const WALK_MIN = 0.15; // m/s: below this the avatar stands
export const RUN_FROM = 1.5; // m/s: switch walk -> run
/** Ground speed each clip covers at timeScale 1 (keeps feet from sliding). */
export const CLIP_SPEED = { walk: 1.25, run: 3.0 };
export const TURN_MIN = 0.35; // radians of body-vs-camera gap that triggers a turn step

export type LocoState = { speed: number; airborne: boolean; vy: number; sitting: "no" | "down" | "yes" | "up"; turnGap: number };

export function pickClip(s: LocoState): Clip {
  if (s.sitting === "down") return "sitDown";
  if (s.sitting === "yes") return "sit";
  if (s.sitting === "up") return "standUp";
  if (s.airborne) return s.vy > 0.5 ? "jump" : "fall";
  if (s.speed >= RUN_FROM) return "run";
  if (s.speed >= WALK_MIN) return "walk";
  if (Math.abs(s.turnGap) >= TURN_MIN) return "turn";
  return "idle";
}

/** Playback rate matched to ground speed so steps land where the feet are. */
export function clipRate(clip: Clip, speed: number): number {
  if (clip === "walk") return Math.max(0.5, Math.min(1.6, speed / CLIP_SPEED.walk));
  if (clip === "run") return Math.max(0.7, Math.min(1.4, speed / CLIP_SPEED.run));
  if (clip === "turn") return 0.7;
  return 1;
}

export type Region = "skin" | "tee" | "jeans" | "shoes";
/** Outfit region for a skeleton bone: short-sleeve tee, jeans to the ankle, sneakers. */
export function boneRegion(bone: string): Region {
  if (/^(spine_|clavicle_|upperarm_)/.test(bone)) return "tee";
  if (/^(pelvis|thigh_|calf_)/.test(bone)) return "jeans";
  if (/^(foot_|ball_)/.test(bone)) return "shoes";
  return "skin";
}

export const JUMP_V = 4.2; // m/s take-off
export const GRAVITY = 12; // m/s²
