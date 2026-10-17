import { useEffect, useRef, useState } from "react";
import Hls, { type HlsConfig } from "hls.js";
import { ArrowLeft } from "lucide-react";
import { playbackPlan } from "@/lib/stream-url";
import { isNativeApp } from "@/lib/transport";
import { isBackKey } from "@/lib/remote";
import { NativePlaylistLoader } from "@/lib/hls-native-loader";

const NO_PICTURE = "Este aparelho não exibe a imagem desta versão do canal. Tente a versão HD ou SD.";

type Props = { src: string; title: string; live: boolean; full: boolean; onClose?: () => void };

// One player for preview and fullscreen. In fullscreen it owns the remote:
// OK = pause/play, left/right = seek 10s (movies), Back = close.
export function VideoPlayer({ src, title, live, full, onClose }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("");

  const [round, setRound] = useState(0);
  const failed = status === "Conteúdo indisponível no momento.";
  const failedRef = useRef(false);
  failedRef.current = failed;

  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    let hls: Hls | null = null;
    let step = 0;
    let dead = false;
    let noPicture = false;
    let stall: ReturnType<typeof setTimeout> | undefined;
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const native = isNativeApp();
    const plan = playbackPlan(src, location.protocol === "https:", native, !!v.canPlayType("application/vnd.apple.mpegurl"));
    // Each way of playing gets two tries before moving on to the next one.
    const total = plan.length * 2;
    const fail = () => {
      if (dead) return;
      clearTimeout(openTimer); clearTimeout(retryTimer); clearTimeout(stall);
      // Picture problem on the last way left: keep the sound and explain.
      if (noPicture && step + 1 >= total) { setStatus(NO_PICTURE); return; }
      step++;
      if (step < total) { setStatus("Reconectando..."); retryTimer = setTimeout(start, 700); }
      else { hls?.destroy(); hls = null; setStatus("Conteúdo indisponível no momento."); }
    };
    const start = () => {
      if (dead) return;
      const a = plan[step % plan.length]!;
      setStatus(step ? "Reconectando..." : "Carregando...");
      hls?.destroy(); hls = null;
      v.removeAttribute("src"); v.load();
      clearTimeout(openTimer);
      openTimer = setTimeout(() => { if (v.readyState < 3) fail(); }, 15000);
      if (a.engine === "hls" && Hls.isSupported()) {
        hls = new Hls({
          ...(native ? { pLoader: NativePlaylistLoader as unknown as NonNullable<HlsConfig["pLoader"]> } : {}),
          enableWorker: true, startLevel: 0, startFragPrefetch: true, capLevelToPlayerSize: true,
          abrEwmaDefaultEstimate: 500_000, maxBufferLength: live ? 30 : 60, maxMaxBufferLength: 120,
          backBufferLength: 15, liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 8,
          manifestLoadingTimeOut: 10000, manifestLoadingMaxRetry: 2, levelLoadingMaxRetry: 4,
          fragLoadingTimeOut: 20000, fragLoadingMaxRetry: 6, fragLoadingRetryDelay: 500, nudgeMaxRetry: 10,
        });
        let mediaRecover = 0;
        hls.on(Hls.Events.ERROR, (_e, d) => {
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecover++ < 2) hls?.recoverMediaError(); else fail();
        });
        hls.loadSource(a.url);
        hls.attachMedia(v);
      } else v.src = a.url;
      v.play().catch(() => {});
    };
    // "Waiting" that never ends means this way of playing is stuck: jump to the next.
    let lastTime = -1;
    const onWaiting = () => {
      setStatus("Ajustando à sua internet...");
      clearTimeout(stall);
      lastTime = v.currentTime;
      stall = setTimeout(() => {
        if (hls) { hls.nextLevel = 0; if (live && hls.liveSyncPosition) v.currentTime = hls.liveSyncPosition; }
        stall = setTimeout(() => { if (v.currentTime === lastTime) fail(); }, 8000);
      }, 6000);
    };
    // Audio but black picture: the device can't decode this video (often H.265).
    let picture: ReturnType<typeof setTimeout> | undefined;
    const onPlaying = () => {
      clearTimeout(stall); clearTimeout(openTimer); setStatus("");
      clearTimeout(picture);
      picture = setTimeout(() => {
        if (!dead && !v.paused && v.videoWidth === 0 && v.videoHeight === 0) {
          noPicture = true; fail();
        }
      }, 4000);
    };
    const onError = () => { if (!hls) fail(); };
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("error", onError);
    start();
    return () => {
      dead = true;
      clearTimeout(stall); clearTimeout(openTimer); clearTimeout(retryTimer); clearTimeout(picture);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("error", onError);
      hls?.destroy();
      v.removeAttribute("src");
      v.load();
    };
  }, [src, live, round]);

  useEffect(() => {
    if (!full) return;
    const h = (e: KeyboardEvent) => {
      const v = ref.current;
      if (!v) return;
      if (isBackKey(e, false)) { e.preventDefault(); e.stopImmediatePropagation(); onClose?.(); return; }
      if (e.key === "Enter" || e.key === " " || e.key === "MediaPlayPause") {
        e.preventDefault(); e.stopImmediatePropagation();
        if (failedRef.current) setRound((r) => r + 1); else if (v.paused) v.play(); else v.pause();
      }
      else if (!live && e.key === "ArrowRight") { e.preventDefault(); e.stopImmediatePropagation(); v.currentTime += 10; }
      else if (!live && e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); v.currentTime -= 10; }
      else if (e.key.startsWith("Arrow")) { e.preventDefault(); e.stopImmediatePropagation(); }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [full, live, onClose]);

  return (
    <div className={full ? "fixed inset-0 z-50 bg-background" : "relative aspect-video w-full overflow-hidden rounded-xl bg-muted"}>
      <video ref={ref} controls={full} playsInline autoPlay className="h-full w-full bg-background object-contain" />
      {full && (
        <div className="absolute left-0 top-0 flex items-center gap-4 p-4">
          <button onClick={onClose} className="flex items-center gap-2 rounded-full bg-background/80 px-5 py-2 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <span className="pointer-events-none truncate text-sm font-semibold sm:text-lg text-foreground drop-shadow">{title}</span>
        </div>
      )}
      {status && (
        <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3 text-center">
          <span className="pointer-events-none rounded-full bg-background/80 px-4 py-2 text-sm text-primary">{status}</span>
          {failed && !isNativeApp() && (
            <span className="pointer-events-none max-w-md rounded-xl bg-background/80 px-4 py-2 text-xs text-muted-foreground">
              Alguns servidores não liberam canais no navegador do computador. No app CTL P2P REVENDA (celular, TV ou TV box) o canal abre normalmente.
            </span>
          )}
          {failed && (
            <button onClick={() => setRound((r) => r + 1)} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">
              Tentar novamente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
