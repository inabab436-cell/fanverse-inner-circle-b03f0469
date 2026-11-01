import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type Msg = { id: string; user_id: string; content: string; is_artist: boolean; nodded: boolean; created_at: string; name?: string };
const EMOJIS = ["💗", "🔥", "😂", "😢", "👏", "🎶"];
const TOPICS = [
  "أول أغنية سمعتها لإليسا وأين كنت؟",
  "لو اخترت أغنية تصف يومك، ماذا تختار؟",
  "أجمل سطر في أغنية تحبها؟",
  "أي حفلة تتمنى حضورها ولماذا؟",
  "أغنية تذكّرك بشخص عزيز؟",
];

export function Room({ artistId, artistName, user, isArtist }: { artistId: string; artistName: string; user: User | null; isArtist: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [asArtist, setAsArtist] = useState(true);
  const [online, setOnline] = useState(0);
  const [bursts, setBursts] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [topic, setTopic] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function loadNames(ids: string[]) {
    const missing = ids.filter((i) => !names[i]);
    if (!missing.length) return;
    const { data } = await supabase.from("profiles").select("id, display_name").in("id", missing);
    if (data) setNames((n) => ({ ...n, ...Object.fromEntries(data.map((p) => [p.id, p.display_name])) }));
  }

  useEffect(() => {
    supabase.from("room_messages").select("*").eq("artist_id", artistId).order("created_at", { ascending: false }).limit(60).then(({ data }) => {
      const list = (data ?? []).reverse();
      setMsgs(list);
      loadNames([...new Set(list.map((m) => m.user_id))]);
    });
    const ch = supabase
      .channel(`room-${artistId}`, { config: { presence: { key: user?.id ?? `guest-${Date.now()}` } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `artist_id=eq.${artistId}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((s) => [...s.slice(-80), m]);
        loadNames([m.user_id]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "room_messages", filter: `artist_id=eq.${artistId}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((s) => s.map((x) => (x.id === m.id ? { ...x, nodded: m.nodded } : x)));
        if (m.nodded && m.user_id === user?.id) toast.success(`${artistName} أومأت لرسالتك ✨ +20`);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_reactions", filter: `artist_id=eq.${artistId}` }, (p) => {
        const r = p.new as { id: string; emoji: string };
        const b = { id: r.id, emoji: r.emoji, x: 10 + Math.random() * 80 };
        setBursts((s) => [...s, b]);
        setTimeout(() => setBursts((s) => s.filter((y) => y.id !== b.id)), 2500);
      })
      .on("presence", { event: "sync" }, () => setOnline(Object.keys(ch.presenceState()).length))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") ch.track({ at: Date.now() });
      });
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId, user?.id]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), [msgs.length]);

  const pinned = useMemo(() => [...msgs].reverse().find((m) => m.is_artist), [msgs]);

  async function send() {
    if (!user) { toast("سجّل الدخول للدخول للغرفة"); return; }
    if (!text.trim()) return;
    const { error } = await supabase.from("room_messages").insert({ artist_id: artistId, user_id: user.id, content: text.trim(), is_artist: isArtist && asArtist });
    if (error) toast.error("تعذّر الإرسال");
    else setText("");
  }
  async function react(emoji: string) {
    if (!user) { toast("سجّل الدخول للتفاعل"); return; }
    await supabase.from("room_reactions").insert({ artist_id: artistId, user_id: user.id, emoji });
  }
  async function nod(id: string) {
    await supabase.from("room_messages").update({ nodded: true }).eq("id", id);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
          <span className="text-sm font-semibold">الغرفة الحيّة</span>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{online} موجود الآن</span>
      </div>

      {pinned ? (
        <div className="bg-brand px-4 py-3 text-primary-foreground">
          <p className="text-xs opacity-80">📌 آخر سطر من {artistName} — موضوع الغرفة</p>
          <p className="mt-1 font-semibold">{pinned.content}</p>
        </div>
      ) : topic ? (
        <div className="bg-accent-soft px-4 py-3 text-accent">
          <p className="text-xs">🎲 موضوع الغرفة الآن</p>
          <p className="mt-1 font-semibold">{topic}</p>
        </div>
      ) : null}

      <div className="relative h-[420px] space-y-2 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && <p className="pt-20 text-center text-muted-foreground">الغرفة هادئة... ابدأ الحديث 👋</p>}
        {msgs.map((m) => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.is_artist ? "bg-brand text-primary-foreground shadow-soft" : m.nodded ? "border-2 border-accent bg-accent-soft" : mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                <p className="text-[11px] font-semibold opacity-75">{m.is_artist ? `⭐ ${artistName}` : names[m.user_id] ?? "فان"}{m.nodded && " · ✨ أومأت لها الفنانة"}</p>
                <p>{m.content}</p>
                {isArtist && !m.is_artist && !m.nodded && (
                  <button onClick={() => nod(m.id)} className="mt-1 text-[11px] underline opacity-80">✨ إيماءة</button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
        {bursts.map((b) => (
          <span key={b.id} className="pointer-events-none absolute bottom-4 animate-[float_2.5s_ease-out_forwards] text-3xl" style={{ left: `${b.x}%` }}>{b.emoji}</span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-1 border-t border-border px-3 py-2">
        <div className="flex gap-1">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => react(e)} className="rounded-full px-2 py-1 text-lg transition-transform hover:scale-125 active:scale-90">{e}</button>
          ))}
        </div>
        <button onClick={() => setTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)]!)} className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">🎲 موضوع</button>
      </div>

      <div className="flex gap-2 border-t border-border p-3">
        {isArtist && (
          <button onClick={() => setAsArtist(!asArtist)} className={`rounded-full px-3 text-xs ${asArtist ? "bg-brand text-primary-foreground" : "bg-secondary"}`}>{asArtist ? "⭐ كفنانة" : "كفان"}</button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          maxLength={280}
          placeholder={user ? "اكتب سطرًا..." : "سجّل الدخول للمشاركة"}
          className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <button onClick={send} className="rounded-full bg-brand px-5 text-sm font-semibold text-primary-foreground">إرسال</button>
      </div>
    </div>
  );
}
