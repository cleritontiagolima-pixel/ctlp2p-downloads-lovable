import { useEffect, useRef, useState } from "react";
import { useBack } from "@/lib/remote";

// Reseller describes a playback problem; AI suggests causes and fixes (streamed).
export function SupportView({ onBack }: { onBack: () => void }) {
  useBack(onBack);
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const ask = async () => {
    if (busy || text.trim().length < 5) return;
    setBusy(true);
    setAnswer("");
    try {
      const r = await fetch("/api/public/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: text }),
      });
      if (!r.ok || !r.body) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setAnswer(j.error ?? "Assistente indisponível no momento.");
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(l.slice(5)) as { type?: string; delta?: string };
            if (ev.type === "response.output_text.delta" && ev.delta) setAnswer((a) => a + ev.delta);
          } catch { /* ignore partial */ }
        }
      }
    } catch {
      setAnswer("Sem conexão com o assistente. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-6">
      <h2 className="text-2xl font-extrabold tracking-wide">Suporte de reprodução</h2>
      <p className="text-sm text-muted-foreground">Descreva o problema (ex.: "canal trava a cada 10 segundos no Wi-Fi") e receba as causas prováveis e como resolver.</p>
      <textarea ref={ref} data-nav value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} rows={4}
        className="rounded-xl border border-border bg-card p-4 text-base outline-none focus:ring-4 focus:ring-primary" />
      <button data-nav onClick={ask} disabled={busy}
        className="self-start rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground outline-none focus:ring-4 focus:ring-ring disabled:opacity-60">
        {busy ? "Analisando..." : "Analisar problema"}
      </button>
      {answer && <div className="whitespace-pre-wrap rounded-xl border border-primary/30 bg-card p-4 text-sm leading-relaxed">{answer}</div>}
    </div>
  );
}
