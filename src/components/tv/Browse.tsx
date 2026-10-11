import { useEffect, useMemo, useState } from "react";
import type { Catalog, Cat, Episode, Item, Program, Section } from "@/lib/catalog";
import { focusFirst, useBack } from "@/lib/remote";
import { VideoPlayer } from "./VideoPlayer";

const ALL = "__all";
const navCls = "outline-none transition focus:ring-4 focus:ring-primary focus:scale-[1.02]";

function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean; retry?: () => void }>({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let ok = true;
    setState({ loading: true });
    fn().then((data) => ok && setState({ data, loading: false }))
      .catch((e: unknown) => ok && setState({ error: e instanceof Error ? e.message : "Erro ao carregar", loading: false, retry: () => setN((x) => x + 1) }));
    return () => { ok = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return state;
}

function Status({ loading, error, retry }: { loading: boolean; error?: string | undefined; retry?: (() => void) | undefined }) {
  if (loading) return <p className="p-6 text-muted-foreground">Carregando...</p>;
  if (error)
    return (
      <div className="p-6">
        <p className="max-w-md text-sm text-destructive">{error}</p>
        {retry && <button data-nav onClick={retry} className={`mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground ${navCls}`}>Tentar novamente</button>}
      </div>
    );
  return null;
}

function Categories({ cats, count, value, onChange, title }: { cats: Cat[]; count: Map<string, number>; value: string; onChange: (id: string) => void; title: string }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card/80">
      <h2 className="px-5 py-4 text-sm font-bold uppercase tracking-widest text-primary">{title}</h2>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {[{ id: ALL, name: "Todos" }, ...cats].map((c) => (
          <button key={c.id} data-nav onClick={() => onChange(c.id)} onFocus={() => onChange(c.id)}
            className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${navCls} ${c.id === value ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
            <span className="truncate">{c.name}</span>
            <span className="ml-2 text-xs opacity-70">{c.id === ALL ? count.get(ALL) ?? 0 : count.get(c.id) ?? 0}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function useSection(catalog: Catalog, section: Section) {
  const cats = useLoad(() => catalog.categories(section), [catalog, section]);
  const items = useLoad(() => catalog.items(section), [catalog, section]);
  const [cat, setCat] = useState(ALL);
  const [q, setQ] = useState("");
  const count = useMemo(() => {
    const m = new Map<string, number>([[ALL, items.data?.length ?? 0]]);
    for (const i of items.data ?? []) m.set(i.cat, (m.get(i.cat) ?? 0) + 1);
    return m;
  }, [items.data]);
  const visible = useMemo(() => {
    const ql = q.toLowerCase();
    return (items.data ?? []).filter((i) => (cat === ALL || i.cat === cat) && (!ql || i.name.toLowerCase().includes(ql)));
  }, [items.data, cat, q]);
  useEffect(() => { if (!cats.loading) focusFirst("aside [data-nav]"); }, [cats.loading]);
  return { cats, items, cat, setCat, q, setQ, count, visible };
}

const fmt = (t: number) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function LiveView({ catalog, onBack }: { catalog: Catalog; onBack: () => void }) {
  const s = useSection(catalog, "live");
  const [current, setCurrent] = useState<Item | null>(null);
  const [full, setFull] = useState(false);
  const [epg, setEpg] = useState<Program[]>([]);
  useBack(() => (full ? setFull(false) : onBack()));

  useEffect(() => {
    setEpg([]);
    if (!current) return;
    let ok = true;
    catalog.epg(current).then((p) => ok && setEpg(p)).catch(() => {});
    return () => { ok = false; };
  }, [catalog, current]);

  const now = Date.now();
  const onAir = epg.find((p) => p.start <= now && p.end > now);

  return (
    <div className="flex h-full">
      <Categories title="TV ao vivo" cats={s.cats.data ?? []} count={s.count} value={s.cat} onChange={s.setCat} />
      <section className="flex w-96 shrink-0 flex-col border-r border-border">
        <input data-nav value={s.q} onChange={(e) => s.setQ(e.target.value)} placeholder="Buscar canal..."
          className={`m-3 rounded-lg border border-input bg-background px-4 py-2.5 text-sm ${navCls}`} />
        <Status loading={s.items.loading} error={s.items.error} retry={s.items.retry} />
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {s.visible.slice(0, 400).map((c, i) => (
            <button key={c.id} data-nav
              onClick={() => (current?.id === c.id ? setFull(true) : setCurrent(c))}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm ${navCls} ${current?.id === c.id ? "bg-accent" : "hover:bg-accent/60"}`}>
              <span className="w-8 text-right text-xs text-muted-foreground">{i + 1}</span>
              {c.icon ? <img src={c.icon} alt="" loading="lazy" className="h-9 w-12 rounded object-contain" /> : <div className="h-9 w-12 rounded bg-muted" />}
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {current ? (
          <VideoPlayer src={catalog.liveUrl(current)} title={current.name} live full={full} onClose={() => setFull(false)} />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-xl bg-muted text-muted-foreground">Escolha um canal</div>
        )}
        {current && (
          <div>
            <h3 className="text-xl font-bold">{current.name}</h3>
            <p className="text-xs text-muted-foreground">OK novamente para tela cheia</p>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">Guia de programação</h4>
          {!current && <p className="text-sm text-muted-foreground">Selecione um canal para ver a programação.</p>}
          {current && !epg.length && <p className="text-sm text-muted-foreground">Sem guia disponível para este canal.</p>}
          {epg.map((p) => {
            const live = p === onAir;
            const pct = live ? Math.min(100, ((now - p.start) / (p.end - p.start)) * 100) : 0;
            return (
              <div key={p.start} className={`mb-2 rounded-lg p-3 ${live ? "bg-primary/15" : ""}`}>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{fmt(p.start)} - {fmt(p.end)}</span>
                  <span className={`text-sm ${live ? "font-bold text-primary" : ""}`}>{live ? "AGORA • " : ""}{p.title}</span>
                </div>
                {live && <div className="mt-2 h-1 rounded bg-muted"><div className="h-1 rounded bg-primary" style={{ width: `${pct}%` }} /></div>}
                {live && p.desc && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.desc}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function PosterView({ catalog, section, onBack }: { catalog: Catalog; section: "movie" | "series"; onBack: () => void }) {
  const s = useSection(catalog, section);
  const [playing, setPlaying] = useState<{ url: string; title: string } | null>(null);
  const [series, setSeries] = useState<Item | null>(null);
  useBack(() => (playing ? setPlaying(null) : series ? setSeries(null) : onBack()));

  if (series) return <EpisodesView catalog={catalog} series={series} playing={playing} setPlaying={setPlaying} onBack={() => setSeries(null)} />;

  const open = (i: Item) => {
    if (section === "series" && catalog.hasEpisodes) setSeries(i);
    else setPlaying({ url: section === "movie" ? catalog.movieUrl(i) : (i.url ?? ""), title: i.name });
  };

  return (
    <div className="flex h-full">
      <Categories title={section === "movie" ? "Filmes" : "Séries"} cats={s.cats.data ?? []} count={s.count} value={s.cat} onChange={s.setCat} />
      <section className="flex flex-1 flex-col">
        <input data-nav value={s.q} onChange={(e) => s.setQ(e.target.value)} placeholder="Buscar..."
          className={`m-4 max-w-md rounded-lg border border-input bg-background px-4 py-2.5 text-sm ${navCls}`} />
        <Status loading={s.items.loading} error={s.items.error} retry={s.items.retry} />
        <div className="grid flex-1 auto-rows-max grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 overflow-y-auto px-4 pb-6">
          {s.visible.slice(0, 300).map((i) => (
            <button key={i.id} data-nav onClick={() => open(i)} className={`group rounded-xl text-left ${navCls}`}>
              <div className="aspect-[2/3] overflow-hidden rounded-xl bg-muted">
                {i.icon && <img src={i.icon} alt="" loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <p className="mt-2 line-clamp-2 text-sm">{i.name}</p>
              {i.rating && i.rating !== "0" && <p className="text-xs text-primary">★ {i.rating}</p>}
            </button>
          ))}
        </div>
      </section>
      {playing && <VideoPlayer src={playing.url} title={playing.title} live={false} full onClose={() => setPlaying(null)} />}
    </div>
  );
}

function EpisodesView({ catalog, series, playing, setPlaying, onBack }: {
  onBack: () => void; catalog: Catalog; series: Item; playing: { url: string; title: string } | null; setPlaying: (p: { url: string; title: string } | null) => void;
}) {
  const eps = useLoad(() => catalog.episodes(series.id), [catalog, series.id]);
  const seasons = useMemo(() => Array.from(new Set((eps.data ?? []).map((e) => e.season))), [eps.data]);
  const [season, setSeason] = useState("");
  const cur = season || seasons[0] || "";
  useEffect(() => { if (!eps.loading) focusFirst(); }, [eps.loading]);
  const list: Episode[] = (eps.data ?? []).filter((e) => e.season === cur);
  return (
    <div className="flex h-full flex-col overflow-y-auto p-8">
      <button data-nav onClick={onBack} className={`mb-5 self-start rounded-full bg-card px-5 py-2 text-sm font-bold ${navCls}`}>← Voltar para as séries</button>
      <div className="flex gap-6">
        {series.icon && <img src={series.icon} alt="" className="h-60 w-40 rounded-xl object-cover" />}
        <div>
          <h2 className="text-3xl font-bold">{series.name}</h2>
          {series.plot && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{series.plot}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {seasons.map((s) => (
              <button key={s} data-nav onClick={() => setSeason(s)} onFocus={() => setSeason(s)}
                className={`rounded-lg px-4 py-2 text-sm ${navCls} ${s === cur ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                Temporada {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Status loading={eps.loading} error={eps.error} retry={eps.retry} />
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {list.map((e) => (
          <button key={e.id} data-nav onClick={() => setPlaying({ url: catalog.episodeUrl(e), title: `${series.name} - ${e.title}` })}
            className={`flex items-center gap-3 rounded-xl bg-card p-3 text-left ${navCls}`}>
            <span className="text-2xl font-bold text-primary">{e.num}</span>
            <span className="line-clamp-2 text-sm">{e.title}</span>
          </button>
        ))}
      </div>
      {playing && <VideoPlayer src={playing.url} title={playing.title} live={false} full onClose={() => setPlaying(null)} />}
    </div>
  );
}
