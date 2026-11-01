import elissa from "@/assets/elissa.jpg";

export const artistImages: Record<string, string> = { elissa };

export const postKinds = [
  { value: "thought", label: "فكرة", points: 5 },
  { value: "art", label: "عمل فني", points: 15 },
  { value: "translation", label: "ترجمة", points: 12 },
  { value: "help", label: "مساعدة فان جديد", points: 10 },
] as const;

export const levels = [
  { min: 0, name: "زائر فضولي" },
  { min: 30, name: "صديق المجتمع" },
  { min: 100, name: "صانع أثر" },
  { min: 250, name: "روح العالم" },
  { min: 600, name: "أسطورة المجتمع" },
];

export function levelFor(points: number) {
  let i = 0;
  levels.forEach((l, idx) => {
    if (points >= l.min) i = idx;
  });
  const cur = levels[i]!;
  const next = levels[i + 1];
  const progress = next ? ((points - cur.min) / (next.min - cur.min)) * 100 : 100;
  return { index: i + 1, name: cur.name, next, progress };
}

export function badgesFor(stats: { posts: number; art: number; translation: number; help: number; projects: number }) {
  const b: string[] = [];
  if (stats.posts >= 1) b.push("أول خطوة");
  if (stats.art >= 1) b.push("فنان المجتمع");
  if (stats.translation >= 1) b.push("المترجم");
  if (stats.help >= 1) b.push("المرحِّب بالجدد");
  if (stats.projects >= 1) b.push("يد واحدة");
  return b;
}
