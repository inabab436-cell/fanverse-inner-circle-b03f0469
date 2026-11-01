import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { Hand, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { advance, type Vec } from "@/lib/movement";
import { assignPointer, releasePointer, stickVector, zoneFor, type Slots } from "@/lib/touchControls";
import { useAvatar } from "@/components/AvatarModel";
import type { Gender } from "@/lib/avatar";

const UNIT = 0.01; // movement px -> metres
const ROOM = 460; // px
const TABLE_R = 135; // px
const LOOK_SPEED = 0.0075; // radians of camera turn per dragged px
const LOOK_SMOOTH = 30; // camera catch-up rate
const FOLLOW_SMOOTH = 10; // camera target follow rate
const TURN = 10; // body turn-to-camera rate
const SHOULDER = 0.35;
const PITCH_DEFAULT = 0.42, PITCH_MIN = 0.12, PITCH_MAX = 0.9;
type PE = import("react").PointerEvent<HTMLDivElement>;

type Ctl = { input: Vec; touch: Vec; fast: boolean; wave: number; pos: Vec; vel: Vec; yaw: number; camYaw: number; camYawTarget: number; pitch: number; pitchTarget: number; looking?: boolean };

function clampToRoom(p: Vec): Vec {
  let { x, y } = p;
  const d = Math.hypot(x, y);
  if (d < TABLE_R) { const k = d || 1; x = (x / k) * TABLE_R; y = (y / k) * TABLE_R; }
  return { x: Math.max(-ROOM, Math.min(ROOM, x)), y: Math.max(-ROOM, Math.min(ROOM, y)) };
}

function Avatar({ ctl, gender }: { ctl: React.MutableRefObject<Ctl>; gender: Gender }) {
  const group = useRef<THREE.Group>(null);
  const { obj, animations } = useAvatar(gender);
  const { actions } = useAnimations(animations, group);
  const current = useRef("");
  const focus = useRef<THREE.Vector3 | null>(null);
  useFrame((state, delta) => {
    const c = ctl.current;
    const dt = Math.min(delta, 0.05);
    // camera smoothing (independent of movement input)
    const k = 1 - Math.exp(-LOOK_SMOOTH * dt);
    c.camYaw += (c.camYawTarget - c.camYaw) * k;
    c.pitch += (c.pitchTarget - c.pitch) * k;
    const raw = c.touch;
    const cs = Math.cos(c.camYaw), sn = Math.sin(c.camYaw);
    const world = { x: raw.x * cs + raw.y * sn, y: -raw.x * sn + raw.y * cs };
    const next = advance(c.pos, c.vel, world, c.fast, dt);
    c.vel = next.velocity;
    c.pos = clampToRoom({ x: next.position.x, y: next.position.y });
    const speed = Math.hypot(c.vel.x, c.vel.y);
    // body faces where the camera looks whenever walking or looking around
    if (speed > 15 || c.looking) { const target = c.camYaw + Math.PI; c.yaw += Math.atan2(Math.sin(target - c.yaw), Math.cos(target - c.yaw)) * (1 - Math.exp(-TURN * dt)); }
    const g = group.current!;
    g.position.set(c.pos.x * UNIT, 0, c.pos.y * UNIT);
    g.rotation.y = c.yaw;
    if (c.wave > 0) c.wave -= dt;
    const want = c.wave > 0 ? "emote-yes" : speed > 200 ? "sprint" : speed > 15 ? "walk" : "idle";
    if (want !== current.current) { actions[current.current]?.fadeOut(0.2); actions[want]?.reset().fadeIn(0.2).play(); current.current = want; }
    const walkAct = actions["walk"]; if (walkAct) walkAct.timeScale = Math.max(0.6, speed / 120);
    // orbit camera: exact position from smoothed yaw/pitch around a smoothed focus point (no lag-induced jitter)
    const cam = state.camera;
    const f = focus.current ?? (focus.current = new THREE.Vector3(g.position.x, 0.95, g.position.z));
    f.lerp(new THREE.Vector3(g.position.x, 0.95, g.position.z), 1 - Math.exp(-FOLLOW_SMOOTH * dt));
    const portrait = state.size.height > state.size.width;
    const dist = portrait ? 3.8 : 2.9;
    const h = Math.cos(c.pitch) * dist;
    const sx = Math.cos(c.camYaw) * SHOULDER, sz = -Math.sin(c.camYaw) * SHOULDER; // over-the-shoulder offset
    cam.position.set(f.x + sx + Math.sin(c.camYaw) * h, f.y + Math.sin(c.pitch) * dist, f.z + sz + Math.cos(c.camYaw) * h);
    cam.lookAt(f.x + sx, f.y + 0.15, f.z + sz);
    const host = state.gl.domElement.parentElement;
    host?.setAttribute("data-scene-ready", "1");
    host?.setAttribute("data-pos", `${c.pos.x.toFixed(1)},${c.pos.y.toFixed(1)}`);
  });
  return <group ref={group}><primitive object={obj} /></group>;
}

function woodTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#b98257" : "#c48d60"; g.fillRect(0, i * 32, 256, 32); g.fillStyle = "rgba(80,40,20,0.25)"; g.fillRect(0, i * 32, 256, 2); g.fillRect((i * 97) % 256, i * 32, 2, 32); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function Chair({ angle }: { angle: number }) {
  const r = 1.75;
  return (
    <group position={[Math.sin(angle) * r, 0, Math.cos(angle) * r]} rotation-y={angle + Math.PI}>
      <mesh position={[0, 0.48, 0]} castShadow><boxGeometry args={[0.5, 0.07, 0.5]} /><meshStandardMaterial color="#e8b04b" roughness={0.6} /></mesh>
      <mesh position={[0, 0.8, 0.23]} castShadow><boxGeometry args={[0.5, 0.6, 0.06]} /><meshStandardMaterial color="#e8b04b" roughness={0.6} /></mesh>
      {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => <mesh key={i} position={[x!, 0.23, z!]}><cylinderGeometry args={[0.025, 0.025, 0.46]} /><meshStandardMaterial color="#5b3a26" /></mesh>)}
    </group>
  );
}

function Room() {
  const wood = useMemo(woodTexture, []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[11, 11]} /><meshStandardMaterial map={wood} roughness={0.8} /></mesh>
      <mesh position={[0, 2, -5.5]} receiveShadow><boxGeometry args={[11, 4, 0.2]} /><meshStandardMaterial color="#f3e3cf" /></mesh>
      <mesh position={[-5.5, 2, 0]} receiveShadow><boxGeometry args={[0.2, 4, 11]} /><meshStandardMaterial color="#efd9c0" /></mesh>
      <mesh position={[5.5, 2, 0]} receiveShadow><boxGeometry args={[0.2, 4, 11]} /><meshStandardMaterial color="#efd9c0" /></mesh>
      {/* window */}
      <mesh position={[1.8, 2.2, -5.38]}><planeGeometry args={[2.4, 1.5]} /><meshStandardMaterial color="#bfe3ff" emissive="#bfe3ff" emissiveIntensity={0.6} /></mesh>
      {/* rug */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]} receiveShadow><circleGeometry args={[2.6, 48]} /><meshStandardMaterial color="#d9785f" roughness={1} /></mesh>
      {/* table */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow><cylinderGeometry args={[1, 1, 0.08, 48]} /><meshStandardMaterial color="#8a5634" roughness={0.45} /></mesh>
      <mesh position={[0, 0.37, 0]} castShadow><cylinderGeometry args={[0.08, 0.1, 0.74]} /><meshStandardMaterial color="#3d2a1f" /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.45, 0.5, 0.04, 32]} /><meshStandardMaterial color="#3d2a1f" /></mesh>
      {/* cups + vase */}
      {[0.5, 2.6, 4.4].map((a, i) => <mesh key={i} position={[Math.sin(a) * 0.55, 0.85, Math.cos(a) * 0.55]} castShadow><cylinderGeometry args={[0.07, 0.06, 0.13, 20]} /><meshStandardMaterial color={["#ffffff", "#7cc6fe", "#ff8fab"][i] ?? "#ffffff"} /></mesh>)}
      <mesh position={[0, 0.92, 0]} castShadow><sphereGeometry args={[0.13, 24, 16]} /><meshStandardMaterial color="#5aae6f" /></mesh>
      <mesh position={[0, 1.08, 0]}><sphereGeometry args={[0.09, 16, 12]} /><meshStandardMaterial color="#ffd166" /></mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => <Chair key={a} angle={a} />)}
      {/* pendant lamp */}
      <mesh position={[0, 3.2, 0]}><coneGeometry args={[0.4, 0.35, 32, 1, true]} /><meshStandardMaterial color="#2f3a4a" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 3.05, 0]}><sphereGeometry args={[0.12]} /><meshStandardMaterial color="#fff2c4" emissive="#ffd88a" emissiveIntensity={2} /></mesh>
      {/* plants */}
      {[[-4.6, -4.6], [4.6, -4.6]].map(([x, z], i) => <group key={i} position={[x!, 0, z!]}><mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.3, 0.22, 0.5]} /><meshStandardMaterial color="#c56b4a" /></mesh><mesh position={[0, 0.85, 0]} castShadow><sphereGeometry args={[0.5, 20, 14]} /><meshStandardMaterial color="#4fa36b" /></mesh></group>)}
    </group>
  );
}

export function CafeScene({ gender }: { gender: Gender }) {
  const ctl = useRef<Ctl>({ input: { x: 0, y: 0 }, touch: { x: 0, y: 0 }, fast: false, wave: 0, pos: { x: 120, y: 260 }, vel: { x: 0, y: 0 }, yaw: Math.PI, camYaw: 0, camYawTarget: 0, pitch: PITCH_DEFAULT, pitchTarget: PITCH_DEFAULT });
  const slots = useRef<Slots>({ move: null, look: null });
  const origin = useRef({ x: 0, y: 0 });
  const lastLook = useRef({ x: 0, y: 0 });
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const R = 60;
  // One stick element only; it is hidden in place (no fade, no jump) so no ghost copy ever shows.
  function showStick(ox: number, oy: number, dx: number, dy: number) {
    const b = base.current, k = knob.current; if (!b || !k) return;
    b.style.visibility = "visible"; b.style.transform = `translate(${ox - R}px, ${oy - R}px)`;
    k.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function hideStick() { if (base.current) base.current.style.visibility = "hidden"; }
  const local = (e: PE) => { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width }; };
  function onDown(e: PE) {
    const p = local(e);
    const r = assignPointer(slots.current, e.pointerId, zoneFor(p.x, p.w));
    if (!r.role) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    slots.current = r.slots;
    if (r.role === "move") { origin.current = { x: p.x, y: p.y }; ctl.current.touch = { x: 0, y: 0 }; showStick(p.x, p.y, 0, 0); }
    else { lastLook.current = { x: p.x, y: p.y }; ctl.current.looking = true; }
  }
  function onMove(e: PE) {
    const p = local(e);
    if (slots.current.move === e.pointerId) {
      const s = stickVector(origin.current, p, R);
      origin.current = s.origin;
      ctl.current.touch = s.input;
      showStick(s.origin.x, s.origin.y, s.knob.x, s.knob.y);
    } else if (slots.current.look === e.pointerId) {
      const c = ctl.current;
      c.camYawTarget -= (p.x - lastLook.current.x) * LOOK_SPEED;
      c.pitchTarget = Math.max(PITCH_MIN, Math.min(PITCH_MAX, c.pitchTarget + (p.y - lastLook.current.y) * LOOK_SPEED * 0.7));
      lastLook.current = { x: p.x, y: p.y };
    }
  }
  function onUp(e: PE) {
    if (slots.current.move === e.pointerId) { ctl.current.touch = { x: 0, y: 0 }; hideStick(); }
    if (slots.current.look === e.pointerId) ctl.current.looking = false;
    slots.current = releasePointer(slots.current, e.pointerId);
  }

  return (
    <div className="movement-shell relative h-dvh overflow-hidden bg-background">
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [2.4, 2.2, 6.2], fov: 50 }} className="touch-none">
        <color attach="background" args={["#f6e9da"]} />
        <hemisphereLight args={["#fff4e0", "#8a6a50", 0.7]} />
        <directionalLight position={[4, 7, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
        <pointLight position={[0, 2.9, 0]} intensity={6} color="#ffd88a" distance={6} />
        <Environment resolution={64}>
          <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
          <Lightformer intensity={1} color="#ffd9b0" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        </Environment>
        <Room />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={12} blur={2} far={3} />
        <Suspense fallback={null}><Avatar ctl={ctl} gender={gender} /></Suspense>
      </Canvas>
      <header className="movement-header pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h1 dir="ltr" className="text-3xl font-extrabold text-primary">orbit<span className="text-accent">.</span></h1>
          <p className="mt-1 text-xs text-muted-foreground">المقهى · امشِ حول الطاولة</p>
        </div>
      </header>
      <div className="absolute inset-0 touch-none select-none" aria-label="يسار الشاشة للمشي ويمينها لتحريك الكاميرا" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      <div ref={base} className="pointer-events-none absolute left-0 top-0 z-10 flex h-[120px] w-[120px] items-center justify-center rounded-full border-2 border-primary/40 bg-secondary/40 invisible"><div ref={knob} className="h-12 w-12 rounded-full bg-primary/80 shadow-soft" /></div>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-around text-xs text-muted-foreground"><span>يسار الشاشة: المشي · يمين الشاشة: الاتجاه</span></div>
      <Button variant="outline" className="movement-actions absolute bottom-8 right-6 z-10 h-14 w-14 rounded-full border-2 bg-card text-primary" aria-label="تلويح" onClick={() => { ctl.current.wave = 2; }}><Hand className="size-6" /></Button>
    </div>
  );
}

