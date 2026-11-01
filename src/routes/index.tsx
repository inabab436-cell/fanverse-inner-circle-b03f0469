import { createFileRoute } from "@tanstack/react-router";
import { CafeScene } from "@/components/CafeScene";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "orbit — المشي والرؤية" },
      { name: "description", content: "مقهى ثلاثي الأبعاد مع شخصية تمشي حول الطاولة على orbit." },
      { property: "og:title", content: "orbit — المشي والرؤية" },
      { property: "og:description", content: "مساحة تجربة المشي والرؤية في orbit على الهاتف والمتصفح." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: CafeScene,
});
