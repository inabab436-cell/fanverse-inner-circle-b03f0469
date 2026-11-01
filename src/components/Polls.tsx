import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type Poll = { id: string; question: string; options: string[]; by_artist: boolean; created_at: string };
type Vote = { poll_id: string; user_id: string; option_index: number };

export function Polls({ artistId, artistName, user, isArtist }: { artistId: string; artistName: string; user: User | null; isArtist: boolean }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [open, setOpen] = useState(false);

  async function load() {
    const { data } = await supabase.from("polls").select("*").eq("artist_id", artistId).order("by_artist", { ascending: false }).order("created_at", { ascending: false }).limit(20);
    setPolls(data ?? []);
    const ids = (data ?? []).map((p) => p.id);
    if (ids.length) {
      const { data: v } = await supabase.from("poll_votes").select("*").in("poll_id", ids);
      setVotes(v ?? []);
    }
  }
  useEffect(() => {
    load();
    const ch = supabase
      .channel(`polls-${artistId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "poll_votes" }, (p) => setVotes((s) => [...s, p.new as Vote]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "polls", filter: `artist_id=eq.${artistId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId]);

  async function create() {
    if (!user) { toast("سجّل الدخول"); return; }
    const clean = opts.map((o) => o.trim()).filter(Boolean);
    if (!q.trim() || clean.length < 2) { toast("اكتب سؤالًا وخيارين على الأقل"); return; }
    const { error } = await supabase.from("polls").insert({ artist_id: artistId, user_id: user.id, question: q.trim(), options: clean, by_artist: isArtist });
    if (error) { toast.error("تعذّر الإنشاء"); return; }
    setQ(""); setOpts(["", ""]); setOpen(false);
  }
  async function vote(pollId: string, i: number) {
    if (!user) { toast("سجّل الدخول للتصويت"); return; }
    await supabase.from("poll_votes").insert({ poll_id: pollId, user_id: user.id, option_index: i });
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setOpen(!open)} className="w-full rounded-2xl border border-dashed border-primary py-3 text-sm font-semibold text-primary">＋ اطرح سؤالًا على المجتمع</button>
      {open && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="السؤال" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          {opts.map((o, i) => (
            <input key={i} value={o} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`خيار ${i + 1}`} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          ))}
          <div className="flex gap-2">
            {opts.length < 4 && <button onClick={() => setOpts([...opts, ""])} className="rounded-full bg-secondary px-3 py-1 text-xs">＋ خيار</button>}
            <button onClick={create} className="rounded-full bg-brand px-4 py-1 text-sm text-primary-foreground">نشر</button>
          </div>
        </div>
      )}
      {polls.length === 0 && <p className="text-center text-muted-foreground">لا توجد أسئلة بعد</p>}
      {polls.map((p) => {
        const pv = votes.filter((v) => v.poll_id === p.id);
        const mine = pv.find((v) => v.user_id === user?.id);
        return (
          <div key={p.id} className={`rounded-2xl border p-4 ${p.by_artist ? "border-accent bg-accent-soft" : "border-border bg-card"}`}>
            {p.by_artist && <p className="text-xs font-semibold text-accent">⭐ سؤال من {artistName} — صوتك يحسم القرار</p>}
            <h3 className="font-bold">{p.question}</h3>
            <div className="mt-3 space-y-2">
              {p.options.map((o, i) => {
                const n = pv.filter((v) => v.option_index === i).length;
                const pct = pv.length ? Math.round((n / pv.length) * 100) : 0;
                return mine ? (
                  <div key={i} className="relative overflow-hidden rounded-xl bg-secondary px-3 py-2 text-sm">
                    <div className="absolute inset-y-0 right-0 bg-brand opacity-25" style={{ width: `${pct}%` }} />
                    <span className="relative">{o} {mine.option_index === i && "✓"}</span>
                    <span className="relative float-left">{pct}%</span>
                  </div>
                ) : (
                  <button key={i} onClick={() => vote(p.id, i)} className="w-full rounded-xl border border-primary px-3 py-2 text-start text-sm text-primary hover:bg-secondary">{o}</button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{pv.length} صوت</p>
          </div>
        );
      })}
    </div>
  );
}
