import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tv, Film, Clapperboard, LifeBuoy, ArrowLeft, House } from "lucide-react";
import { getDeviceMac } from "@/lib/device";
import { fetchText } from "@/lib/transport";
import { organized } from "@/lib/organize";
import { m3uCatalog, xtreamCatalog, type Catalog, type Xtream } from "@/lib/catalog";
import { focusFirst, useBack, useRemoteNavigation } from "@/lib/remote";
import { LiveView, PosterView } from "@/components/tv/Browse";
import { SupportView } from "@/components/tv/Support";
import logo from "@/assets/logo.jpg.asset.json";
import fundo from "@/assets/fundo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CTL P2P REVENDA" },
      { name: "description", content: "CTL P2P REVENDA — TV ao vivo, filmes e séries com guia de programação." },
      { property: "og:title", content: "CTL P2P REVENDA" },
      { property: "og:description", content: "TV ao vivo, filmes e séries com guia de programação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Activation = { active: boolean; url?: string; xtream?: Xtream | null; expires?: string | null; error?: string };
type Screen = "home" | "live" | "movie" | "series" | "support";

function Index() {
  useRemoteNavigation();
  const [mac, setMac] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [msg, setMsg] = useState("Verificando liberação...");
  const [screen, setScreen] = useState<Screen>("home");

  useEffect(() => {
    const m = getDeviceMac();
    setMac(m);
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const a = (await (await fetch(`/api/public/activate?mac=${encodeURIComponent(m)}`)).json()) as Activation;
        if (a.active) {
          setExpires(a.expires ?? null);
          if (a.xtream) { setCatalog(organized(xtreamCatalog(a.xtream))); return; }
          setMsg("Carregando lista...");
          const text = await fetchText(a.url!);
          if (text.includes("#EXTINF")) { setCatalog(organized(m3uCatalog(text))); return; }
          setMsg("A lista liberada está vazia ou inválida.");
        } else setMsg(a.error ?? "Aguardando liberação no painel");
      } catch (e) { setMsg(e instanceof Error ? e.message : "Sem conexão. Tentando novamente..."); }
      if (!stop) timer = setTimeout(check, 15000);
    };
    check();
    return () => { stop = true; clearTimeout(timer); };
  }, []);

  if (!catalog) return <ActivationScreen mac={mac} msg={msg} />;

  const back = () => { setScreen("home"); };
  if (screen === "home")
    return (
      <main className="dark h-screen overflow-hidden bg-background text-foreground">
        <Home mac={mac} expires={expires} onOpen={setScreen} />
      </main>
    );
  return (
    <main className="dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TopNav screen={screen} onOpen={setScreen} />
      <div className="min-h-0 flex-1">
        {screen === "live" && <LiveView catalog={catalog} onBack={back} />}
        {screen === "movie" && <PosterView key="movie" catalog={catalog} section="movie" onBack={back} />}
        {screen === "series" && <PosterView key="series" catalog={catalog} section="series" onBack={back} />}
        {screen === "support" && <SupportView onBack={back} />}
      </div>
    </main>
  );
}

function TopNav({ screen, onOpen }: { screen: Screen; onOpen: (s: Screen) => void }) {
  const tab = "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold tracking-wide outline-none transition focus:ring-4 focus:ring-primary";
  return (
    <nav className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2">
      <button data-nav onClick={() => onOpen("home")} className={`${tab} hover:bg-accent`}>
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <img src={logo.url} alt="" className="mx-2 h-9 w-9 rounded-lg object-cover" />
      <button data-nav onClick={() => onOpen("home")} className={`${tab} hover:bg-accent`}>
        <House className="h-4 w-4" /> Início
      </button>
      {TILES.map(({ id, label, Icon }) => (
        <button key={id} data-nav onClick={() => onOpen(id)}
          className={`${tab} ${screen === id ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </nav>
  );
}

function ActivationScreen({ mac, msg }: { mac: string; msg: string }) {
  return (
    <main className="dark relative flex min-h-screen items-center justify-end overflow-hidden bg-background p-6 text-foreground md:p-16">
      <img src={fundo.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="relative w-full max-w-md rounded-3xl border border-primary/40 bg-background/70 p-8 text-center shadow-2xl backdrop-blur-md">
        <img src={logo.url} alt="CTL P2P REVENDA" className="mx-auto h-28 w-28 rounded-2xl object-cover md:hidden" />
        <h1 className="mt-2 text-2xl font-extrabold tracking-wide">CTL P2P REVENDA</h1>
        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">Endereço MAC</p>
        <p className="mt-2 font-mono text-3xl font-bold tracking-wider text-primary md:text-4xl">{mac || "—"}</p>
        <p className="mt-6 text-sm text-muted-foreground">{msg}</p>
        <div className="mx-auto mt-3 h-1 w-24 animate-pulse rounded-full bg-primary" />
      </div>
    </main>
  );
}

const TILES = [
  { id: "live", label: "TV AO VIVO", Icon: Tv },
  { id: "movie", label: "FILMES", Icon: Film },
  { id: "series", label: "SÉRIES", Icon: Clapperboard },
  { id: "support", label: "SUPORTE", Icon: LifeBuoy },
] as const;

function Home({ mac, expires, onOpen }: { mac: string; expires: string | null; onOpen: (s: Screen) => void }) {
  useBack(() => {});
  useEffect(() => focusFirst(), []);
  const [clock, setClock] = useState("");
  useEffect(() => {
    const t = () => setClock(new Date().toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }));
    t();
    const i = setInterval(t, 30000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="relative flex h-full flex-col">
      <img src={fundo.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <header className="relative flex items-center justify-between px-10 py-6">
        <div className="flex items-center gap-4">
          <img src={logo.url} alt="CTL P2P REVENDA" className="h-14 w-14 rounded-xl object-cover" />
          <span className="text-xl font-extrabold tracking-wide">CTL P2P REVENDA</span>
        </div>
        <div className="text-right text-sm">
          <p className="capitalize">{clock}</p>
          <p className="font-mono text-xs text-muted-foreground">MAC {mac}{expires ? ` • Válido até ${new Date(expires).toLocaleDateString("pt-BR")}` : ""}</p>
        </div>
      </header>
      <div className="relative flex flex-1 items-center justify-center gap-8 px-10">
        {TILES.map(({ id, label, Icon }) => (
          <button key={id} data-nav onClick={() => onOpen(id)}
            className="flex aspect-[4/3] w-full max-w-xs flex-col items-center justify-center gap-5 rounded-3xl border border-primary/30 bg-card/70 backdrop-blur outline-none transition hover:border-primary focus:scale-105 focus:border-primary focus:bg-primary/20 focus:ring-4 focus:ring-primary">
            <Icon className="h-20 w-20 text-primary" strokeWidth={1.5} />
            <span className="text-2xl font-extrabold tracking-widest">{label}</span>
          </button>
        ))}
      </div>
      <p className="relative pb-6 text-center text-xs text-muted-foreground">Use as setas do controle para navegar e OK para escolher</p>
    </div>
  );
}
