export type Gender = "boy" | "girl";

const KEY = "orbit.gender";

export function readGender(): Gender | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "boy" || v === "girl" ? v : null;
  } catch { return null; }
}

export function saveGender(g: Gender) {
  try { window.localStorage.setItem(KEY, g); } catch { /* storage unavailable */ }
}

/** Shared fan uniform for everyone: black tee with the Elissa print, dark jeans, white sneakers. */
export const OUTFIT = { tee: "#141416", jeans: "#2e3136", shoes: "#f2f2f0" };
