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
    let m = "";
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        if (!m) { m = await getDeviceMac(); setMac(m); }
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
      <main className="dark h-[100dvh] overflow-hidden bg-background text-foreground">
        <Home mac={mac} expires={expires} onOpen={setScreen} />
      </main>
    );
  return (
    <main className="dark flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
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
  const tab = "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs sm:px-5 sm:py-2 sm:text-sm font-bold tracking-wide outline-none transition focus:ring-4 focus:ring-primary";
  return (
    <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-card px-2 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
      <button data-nav onClick={() => onOpen("home")} className={`${tab} hover:bg-accent`}>
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <img src={logo.url} alt="" className="mx-1 hidden h-9 w-9 shrink-0 rounded-lg object-cover sm:block" />
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
    <main className="dark relative flex h-[100dvh] items-center justify-center overflow-y-auto bg-background p-3 text-foreground sm:p-6 md:justify-end md:p-[5vw]">
      <img src={fundo.url} alt="" className="fixed inset-0 h-full w-full object-cover" />
      <div className="relative my-auto w-full max-w-md rounded-3xl border border-primary/40 bg-background/70 p-[clamp(1rem,4vmin,2rem)] text-center shadow-2xl backdrop-blur-md">
        <img src={logo.url} alt="CTL P2P REVENDA" className="mx-auto h-[clamp(4rem,18vmin,7rem)] w-[clamp(4rem,18vmin,7rem)] rounded-2xl object-cover md:hidden" />
        <h1 className="mt-2 text-[clamp(1.1rem,4.5vmin,1.5rem)] font-extrabold tracking-wide">CTL P2P REVENDA</h1>
        <p className="mt-[clamp(0.5rem,3vmin,1.5rem)] text-xs uppercase tracking-[0.3em] text-muted-foreground">Endereço MAC</p>
        <p className="mt-2 whitespace-nowrap font-mono text-[clamp(1.1rem,min(6.5vw,7vmin),2.25rem)] font-bold text-primary">{mac || "—"}</p>
        <p className="mt-[clamp(0.5rem,3vmin,1.5rem)] text-sm text-muted-foreground">{msg}</p>
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
      <header className="relative flex items-center justify-between gap-3 px-[4vw] py-[3vmin]">
        <div className="flex items-center gap-4">
          <img src={logo.url} alt="CTL P2P REVENDA" className="h-[clamp(2.5rem,9vmin,3.5rem)] w-[clamp(2.5rem,9vmin,3.5rem)] shrink-0 rounded-xl object-cover" />
          <span className="text-[clamp(0.95rem,3vmin,1.25rem)] font-extrabold tracking-wide">CTL P2P REVENDA</span>
        </div>
        <div className="text-right text-xs sm:text-sm">
          <p className="capitalize">{clock}</p>
          <p className="font-mono text-xs text-muted-foreground">MAC {mac}{expires ? ` • Válido até ${new Date(expires).toLocaleDateString("pt-BR")}` : ""}</p>
        </div>
      </header>
      <div className="relative grid min-h-0 flex-1 grid-cols-2 content-center justify-items-center gap-[3vmin] px-[4vw] landscape:grid-cols-4">
        {TILES.map(({ id, label, Icon }) => (
          <button key={id} data-nav onClick={() => onOpen(id)}
            className="flex aspect-[4/3] w-full max-w-xs flex-col items-center justify-center gap-[2vmin] rounded-3xl landscape:max-h-[55vh] portrait:max-h-[30vh] border border-primary/30 bg-card/70 backdrop-blur outline-none transition hover:border-primary focus:scale-105 focus:border-primary focus:bg-primary/20 focus:ring-4 focus:ring-primary">
            <Icon className="h-[clamp(2rem,11vmin,5rem)] w-[clamp(2rem,11vmin,5rem)] text-primary" strokeWidth={1.5} />
            <span className="px-2 text-center text-[clamp(0.8rem,3.5vmin,1.5rem)] font-extrabold tracking-widest">{label}</span>
          </button>
        ))}
      </div>
      <p className="relative hidden pb-[3vmin] text-center text-xs sm:block text-muted-foreground">Use as setas do controle para navegar e OK para escolher</p>
    </div>
  );
}
