import { useEffect, useState } from "react";

const LIMIT_MIN = 45;

export function WellbeingNudge() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const today = new Date().toDateString();
    const raw = JSON.parse(localStorage.getItem("wb") || "{}");
    let minutes = raw.day === today ? raw.minutes : 0;
    const t = setInterval(() => {
      minutes += 1;
      localStorage.setItem("wb", JSON.stringify({ day: today, minutes }));
      if (minutes === LIMIT_MIN) setShow(true);
    }, 60000);
    return () => clearInterval(t);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="font-display text-lg font-bold text-primary">وقت لطيف للاستراحة ☁️</p>
      <p className="mt-1 text-sm text-muted-foreground">قضيت {LIMIT_MIN} دقيقة معنا اليوم. المجتمع سيبقى هنا، اشرب ماءً وتمشَّ قليلًا.</p>
      <button onClick={() => setShow(false)} className="mt-3 rounded-full bg-accent px-4 py-1.5 text-sm text-accent-foreground">حسنًا</button>
    </div>
  );
}
