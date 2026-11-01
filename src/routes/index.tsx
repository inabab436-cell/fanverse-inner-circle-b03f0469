import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CafeScene } from "@/components/CafeScene";
import { readGender, type Gender } from "@/lib/avatar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "orbit — المشي والرؤية" },
      { name: "description", content: "مقهى ثلاثي الأبعاد مع شخصيتك تمشي حول الطاولة على orbit." },
      { property: "og:title", content: "orbit — المشي والرؤية" },
      { property: "og:description", content: "مساحة تجربة المشي والرؤية في orbit على الهاتف." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [gender, setGender] = useState<Gender | null>(null);
  useEffect(() => {
    const g = readGender();
    if (g) setGender(g); else navigate({ to: "/choose", replace: true });
  }, [navigate]);
  return gender ? <CafeScene gender={gender} /> : <div className="h-dvh bg-background" />;
}
