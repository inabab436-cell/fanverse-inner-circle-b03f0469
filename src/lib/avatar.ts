export type Gender = "boy" | "girl" | "custom";

const KEY = "orbit.gender";

export function readGender(): Gender | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "boy" || v === "girl" || v === "custom" ? v : null;
  } catch { return null; }
}

export function saveGender(g: Gender) {
  try { window.localStorage.setItem(KEY, g); } catch { /* storage unavailable */ }
}

/** Shared fan uniform: black tee with the Elissa print for everyone; boy and girl differ only in cut and details. */
export const UNIFORM = { base: "#16181d", shirt: "#111214", accent: "#d4a645" };

/** Texture-atlas cells (32x64 px columns/rows of the 512px colormap) recoloured per model. */
export type Recolor = { col: number; row: number; color: string };
export const UNIFORM_CELLS: Record<Gender, Recolor[]> = {
  custom: [],
  girl: [
    { col: 3, row: 6, color: UNIFORM.base }, { col: 3, row: 7, color: UNIFORM.base },
    { col: 9, row: 6, color: UNIFORM.shirt }, { col: 9, row: 7, color: UNIFORM.shirt },
  ],
  boy: [
    { col: 1, row: 6, color: UNIFORM.base }, { col: 1, row: 7, color: UNIFORM.base },
    { col: 9, row: 6, color: UNIFORM.shirt }, { col: 9, row: 7, color: UNIFORM.shirt },
    { col: 9, row: 4, color: UNIFORM.accent }, { col: 9, row: 5, color: UNIFORM.accent },
    { col: 11, row: 6, color: "#3a2418" }, { col: 11, row: 7, color: "#3a2418" },
  ],
};
