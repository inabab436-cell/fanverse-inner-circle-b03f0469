import type { Vec } from "./movement";

/** Vertical squash for the lightweight 2.5D (oblique) view. */
export const SQUASH = 0.62;
export const WORLD = 1100;

export type PropKind = "tree" | "bush" | "lamp" | "bench" | "fountain" | "flower";
export type Prop = { kind: PropKind; x: number; y: number; r: number; seed: number };

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export function buildProps(): Prop[] {
  const rand = rng(42);
  const props: Prop[] = [{ kind: "fountain", x: 0, y: -220, r: 70, seed: 1 }];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; props.push({ kind: "lamp", x: Math.cos(a) * 330, y: Math.sin(a) * 330 - 220, r: 8, seed: i }); }
  props.push({ kind: "bench", x: -160, y: 60, r: 0, seed: 2 }, { kind: "bench", x: 160, y: 60, r: 0, seed: 3 });
  for (let i = 0; i < 70; i++) {
    const x = (rand() * 2 - 1) * WORLD, y = (rand() * 2 - 1) * WORLD;
    if (Math.hypot(x, y + 220) < 420 || Math.hypot(x, y) < 140) continue;
    const t = rand();
    props.push(t < 0.45 ? { kind: "tree", x, y, r: 22, seed: i } : t < 0.75 ? { kind: "bush", x, y, r: 16, seed: i } : { kind: "flower", x, y, r: 0, seed: i });
  }
  return props;
}

/** Push a position out of solid props and keep it inside the world. */
export function collide(p: Vec, props: Prop[], radius = 14): Vec {
  let { x, y } = p;
  for (const prop of props) {
    if (prop.r <= 0) continue;
    const dx = x - prop.x, dy = y - prop.y, d = Math.hypot(dx, dy), min = prop.r + radius;
    if (d < min) { const k = d || 1; x = prop.x + (dx / k) * min; y = prop.y + (dy / k) * min; }
  }
  return { x: Math.max(-WORLD, Math.min(WORLD, x)), y: Math.max(-WORLD, Math.min(WORLD, y)) };
}

export type Avatar = { name: string; x: number; y: number; angle: number; moving: boolean; fast?: boolean; skin: string; shirt: string; hair: string; target?: Vec | undefined; wait?: number };

export function buildNpcs(): Avatar[] {
  return [
    { name: "ليلى", x: -260, y: 120, angle: 0, moving: false, skin: "#f6d3b3", shirt: "#ff8fab", hair: "#4a2c2a" },
    { name: "سامي", x: 240, y: -40, angle: Math.PI, moving: false, skin: "#d9a273", shirt: "#7cc6fe", hair: "#1f1a17" },
    { name: "نور", x: 80, y: 260, angle: 0, moving: false, skin: "#f1c7a0", shirt: "#ffd166", hair: "#8a4b2a" },
    { name: "زين", x: -120, y: -460, angle: 0, moving: false, skin: "#b9805a", shirt: "#95e1a6", hair: "#2b2b2b" },
  ];
}

export function stepNpc(n: Avatar, props: Prop[], dt: number) {
  if (n.wait && n.wait > 0) { n.wait -= dt; n.moving = false; return; }
  if (!n.target) n.target = { x: n.x + (Math.random() * 2 - 1) * 260, y: n.y + (Math.random() * 2 - 1) * 260 };
  const dx = n.target.x - n.x, dy = n.target.y - n.y, d = Math.hypot(dx, dy);
  if (d < 6) { n.target = undefined; n.wait = 1 + Math.random() * 3; n.moving = false; return; }
  const s = Math.min(d, 55 * dt);
  const next = collide({ x: n.x + (dx / d) * s, y: n.y + (dy / d) * s }, props);
  if (Math.hypot(next.x - n.x, next.y - n.y) < s * 0.3) n.target = undefined;
  n.x = next.x; n.y = next.y; n.angle = Math.atan2(dy, dx); n.moving = true;
}

export function drawGround(ctx: CanvasRenderingContext2D, left: number, top: number, w: number, h: number, props: Prop[]) {
  ctx.fillStyle = "#9fd88a"; ctx.fillRect(left, top, w, h);
  const T = 80;
  ctx.fillStyle = "#94cf7f";
  for (let x = Math.floor(left / T) * T; x < left + w; x += T)
    for (let y = Math.floor(top / T) * T; y < top + h; y += T)
      if (((x / T) + (y / T)) % 2 === 0) ctx.fillRect(x, y, T, T);
  // plaza + path
  ctx.fillStyle = "#efe2c8"; ctx.beginPath(); ctx.arc(0, -220, 360, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-60, -220, 120, 1400);
  ctx.strokeStyle = "#e0cfae"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -220, 360, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -220, 200, 0, Math.PI * 2); ctx.stroke();
  for (const p of props) if (p.kind === "flower") {
    const colors = ["#ff8fab", "#ffd166", "#ffffff", "#c8b6ff"];
    for (let i = 0; i < 5; i++) { ctx.fillStyle = colors[(p.seed + i) % 4]!; ctx.beginPath(); ctx.arc(p.x + Math.cos(i * 1.3) * 14, p.y + Math.sin(i * 2.1) * 10, 4, 0, Math.PI * 2); ctx.fill(); }
  }
}

function shadow(ctx: CanvasRenderingContext2D, rx: number) { ctx.fillStyle = "rgba(30,40,60,0.18)"; ctx.beginPath(); ctx.ellipse(0, 0, rx, rx * 0.38, 0, 0, Math.PI * 2); ctx.fill(); }

export function drawProp(ctx: CanvasRenderingContext2D, p: Prop, time: number) {
  switch (p.kind) {
    case "tree": {
      shadow(ctx, 30);
      ctx.fillStyle = "#8a5a3b"; ctx.fillRect(-6, -34, 12, 34);
      const sway = Math.sin(time / 900 + p.seed) * 2;
      for (const [x, y, r, c] of [[-14, -52, 22, "#4fa36b"], [14, -54, 22, "#4fa36b"], [sway, -76, 26, "#5cb879"], [sway - 6, -84, 10, "#7fd19a"]] as const) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case "bush": {
      shadow(ctx, 22);
      for (const [x, y, r, c] of [[-10, -12, 13, "#5aae6f"], [10, -12, 13, "#5aae6f"], [0, -22, 14, "#6cc184"]] as const) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case "lamp": {
      shadow(ctx, 10);
      ctx.fillStyle = "#4b5563"; ctx.fillRect(-3, -70, 6, 70);
      ctx.fillStyle = "rgba(255,220,120,0.35)"; ctx.beginPath(); ctx.arc(0, -76, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffe08a"; ctx.beginPath(); ctx.arc(0, -76, 8, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "bench": {
      shadow(ctx, 40);
      ctx.fillStyle = "#6b4a33"; ctx.fillRect(-34, -14, 4, 14); ctx.fillRect(30, -14, 4, 14);
      ctx.fillStyle = "#b07a4f"; ctx.beginPath(); ctx.roundRect(-38, -20, 76, 9, 3); ctx.fill();
      ctx.fillStyle = "#c48b5c"; ctx.beginPath(); ctx.roundRect(-38, -38, 76, 9, 3); ctx.fill();
      break;
    }
    case "fountain": {
      ctx.fillStyle = "#cbd5e1"; ctx.beginPath(); ctx.ellipse(0, 0, 80, 80 * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#94a3b8"; ctx.fillRect(-80, -14, 160, 14);
      ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.ellipse(0, -14, 80, 80 * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7dd3fc"; ctx.beginPath(); ctx.ellipse(0, -14, 66, 66 * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#94a3b8"; ctx.fillRect(-7, -60, 14, 46);
      const j = Math.sin(time / 200) * 3;
      ctx.fillStyle = "rgba(186,230,253,0.9)"; ctx.beginPath(); ctx.ellipse(0, -70 + j, 10, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -14, 40 + (time / 30) % 26, (40 + (time / 30) % 26) * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    default: break;
  }
}

export function drawAvatar(ctx: CanvasRenderingContext2D, a: Avatar, time: number, isYou = false) {
  const step = a.moving ? Math.sin(time / (a.fast ? 70 : 110) + a.x * 0.01) : 0;
  const bob = -Math.abs(step) * 3;
  shadow(ctx, 15);
  ctx.save(); ctx.translate(0, bob);
  // legs
  ctx.fillStyle = "#3b3f5c";
  ctx.beginPath(); ctx.roundRect(-8, -12 + step * 2, 6, 12, 3); ctx.roundRect(2, -12 - step * 2, 6, 12, 3); ctx.fill();
  // body
  ctx.fillStyle = a.shirt; ctx.beginPath(); ctx.roundRect(-12, -32, 24, 23, 10); ctx.fill();
  // arms
  ctx.beginPath(); ctx.ellipse(-13, -22 - step * 2, 4, 7, 0, 0, Math.PI * 2); ctx.ellipse(13, -22 + step * 2, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
  // head
  const dx = Math.cos(a.angle), dy = Math.sin(a.angle);
  ctx.fillStyle = a.skin; ctx.beginPath(); ctx.arc(0, -48, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = a.hair;
  if (dy < -0.55) { ctx.beginPath(); ctx.arc(0, -49, 17.5, 0, Math.PI * 2); ctx.fill(); }
  else {
    ctx.beginPath(); ctx.arc(0, -52, 17.5, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(dx * 5, -60, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    const ex = dx * 6;
    const blink = (time + a.x * 37) % 3200 < 120;
    ctx.fillStyle = "#2a2440";
    if (blink) { ctx.fillRect(ex - 8, -46, 5, 1.6); ctx.fillRect(ex + 3, -46, 5, 1.6); }
    else { ctx.beginPath(); ctx.arc(ex - 5.5, -45, 2.6, 0, Math.PI * 2); ctx.arc(ex + 5.5, -45, 2.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(255,120,140,0.45)"; ctx.beginPath(); ctx.ellipse(ex - 9, -39, 3.5, 2, 0, 0, Math.PI * 2); ctx.ellipse(ex + 9, -39, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2a2440"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(ex, -40, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  ctx.restore();
  // name tag
  ctx.font = "600 11px 'IBM Plex Sans Arabic', sans-serif"; ctx.textAlign = "center";
  const w = ctx.measureText(a.name).width + 16;
  ctx.fillStyle = isYou ? "#3b5bdb" : "rgba(255,255,255,0.92)"; ctx.beginPath(); ctx.roundRect(-w / 2, -92, w, 19, 9); ctx.fill();
  ctx.fillStyle = isYou ? "#ffffff" : "#2a2440"; ctx.fillText(a.name, 0, -79);
}
