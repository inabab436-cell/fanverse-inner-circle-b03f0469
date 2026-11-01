import { Suspense, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useAnimations } from "@react-three/drei";
import type * as THREE from "three";
import { Button } from "@/components/ui/button";
import { useAvatar } from "@/components/AvatarModel";
import { readGender, saveGender, type Gender } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/choose")({
  head: () => ({
    meta: [
      { title: "اختر شخصيتك — orbit" },
      { name: "description", content: "اختر ولد أو بنت بزي الفانز الموحد قبل دخول مقهى orbit." },
      { property: "og:title", content: "اختر شخصيتك — orbit" },
      { property: "og:description", content: "ولد أو بنت، بزي موحد للجميع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: Choose,
});

function Preview({ gender, active }: { gender: Gender; active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { obj, animations } = useAvatar(gender);
  const { actions } = useAnimations(animations, group);
  const cur = useRef("");
  useFrame((_, dt) => {
    const want = active ? "Walk_Loop" : "Idle_Loop";
    if (cur.current !== want) { actions[cur.current]?.fadeOut(0.2); actions[want]?.reset().fadeIn(0.2).play(); cur.current = want; }
    if (group.current) group.current.rotation.y += Math.min(dt, 0.05) * (active ? 0.9 : 0.3);
  });
  return <group ref={group}><primitive object={obj} /></group>;
}

function Card({ gender, label, note, active, onPick }: { gender: Gender; label: string; note: string; active: boolean; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} aria-pressed={active}
      className={cn("flex flex-1 flex-col overflow-hidden rounded-3xl border-2 bg-card text-card-foreground transition", active ? "border-primary shadow-soft" : "border-border opacity-80")}>
      <div className="h-[34dvh] w-full">
        <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 1.15, 3.4], fov: 40 }} onCreated={({ camera }) => camera.lookAt(0, 0.85, 0)}>
          <hemisphereLight args={["#fff4e0", "#5a6a70", 0.9]} />
          <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow />
          <Environment resolution={32}><Lightformer intensity={2} position={[0, 4, 2]} scale={[6, 6, 1]} /></Environment>
          <Suspense fallback={null}><Preview gender={gender} active={active} /></Suspense>
          <ContactShadows opacity={0.4} scale={3} blur={2} far={2} />
        </Canvas>
      </div>
      <div className="p-3 text-center">
        <p className="text-lg font-bold">{label}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
    </button>
  );
}

function Choose() {
  const navigate = useNavigate();
  const [pick, setPick] = useState<Gender>(() => readGender() ?? "girl");
  return (
    <main className="flex min-h-dvh flex-col gap-5 bg-background px-5 py-6">
      <header>
        <h1 dir="ltr" className="text-right text-3xl font-extrabold text-primary">orbit<span className="text-accent">.</span></h1>
        <p className="mt-2 text-xl font-bold text-foreground">اختر شخصيتك</p>
        <p className="text-sm text-muted-foreground">زي الفانز الموحد: تيشيرت أسود عليه صورة إليسا، جينز داكن وحذاء أبيض للجميع.</p>
      </header>
      <div className="flex gap-3">
        <Card gender="girl" label="بنت" note="شعر طويل" active={pick === "girl"} onPick={() => setPick("girl")} />
        <Card gender="boy" label="ولد" note="شعر قصير" active={pick === "boy"} onPick={() => setPick("boy")} />
      </div>
      <Button size="lg" className="mt-auto h-14 rounded-full text-lg" onClick={() => { saveGender(pick); navigate({ to: "/" }); }}>
        ادخل المقهى
      </Button>
    </main>
  );
}
