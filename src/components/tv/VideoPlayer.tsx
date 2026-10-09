import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { playableUrl, isHlsUrl } from "@/lib/stream-url";
import { isNativeApp } from "@/lib/transport";
import { isBackKey } from "@/lib/remote";

type Props = { src: string; title: string; live: boolean; full: boolean; onClose?: () => void };

// One player for preview and fullscreen. In fullscreen it owns the remote:
// OK = pause/play, left/right = seek 10s (movies), Back = close.
export function VideoPlayer({ src, title, live, full, onClose }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    let hls: Hls | null = null;
    let retries = 0;
    let stall: ReturnType<typeof setTimeout> | undefined;
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    const url = playableUrl(src, location.protocol === "https:", isNativeApp());
    const retry = () => {
      if (retries++ < 5) { setStatus("Reconectando..."); setTimeout(start, 800 * retries); }
      else setStatus("Conteúdo indisponível no momento.");
    };
    const start = () => {
      setStatus("Carregando...");
      hls?.destroy();
      clearTimeout(openTimer);
      openTimer = setTimeout(() => { if (v.readyState < 3) retry(); }, 15000);
      if (isHlsUrl(url) && Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true, startLevel: 0, startFragPrefetch: true, capLevelToPlayerSize: true,
          abrEwmaDefaultEstimate: 500_000, maxBufferLength: live ? 30 : 60, maxMaxBufferLength: 120,
          backBufferLength: 15, liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 8,
          manifestLoadingTimeOut: 10000, manifestLoadingMaxRetry: 4, levelLoadingMaxRetry: 6,
          fragLoadingTimeOut: 20000, fragLoadingMaxRetry: 8, fragLoadingRetryDelay: 500, nudgeMaxRetry: 10,
        });
        hls.on(Hls.Events.ERROR, (_e, d) => {
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError(); else retry();
        });
        hls.on(Hls.Events.FRAG_BUFFERED, () => { retries = 0; });
        hls.loadSource(url);
        hls.attachMedia(v);
      } else v.src = url;
      v.play().catch(() => {});
    };
    const onWaiting = () => {
      setStatus("Ajustando à sua internet...");
      clearTimeout(stall);
      stall = setTimeout(() => {
        if (hls) { hls.nextLevel = 0; if (live && hls.liveSyncPosition) v.currentTime = hls.liveSyncPosition; }
        else if (live) start();
      }, 6000);
    };
    const onPlaying = () => { clearTimeout(stall); clearTimeout(openTimer); setStatus(""); };
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("error", retry);
    start();
    return () => {
      clearTimeout(stall); clearTimeout(openTimer);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("error", retry);
      hls?.destroy();
      v.removeAttribute("src");
    };
  }, [src, live]);

  useEffect(() => {
    if (!full) return;
    const h = (e: KeyboardEvent) => {
      const v = ref.current;
      if (!v) return;
      if (isBackKey(e, false)) { e.preventDefault(); e.stopImmediatePropagation(); onClose?.(); return; }
      if (e.key === "Enter" || e.key === " " || e.key === "MediaPlayPause") { e.preventDefault(); e.stopImmediatePropagation(); if (v.paused) v.play(); else v.pause(); }
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
      {full && <div className="pointer-events-none absolute left-0 top-0 p-6 text-lg font-semibold text-foreground drop-shadow">{title}</div>}
      {status && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center">
          <span className="rounded-full bg-background/80 px-4 py-2 text-sm text-primary">{status}</span>
        </div>
      )}
    </div>
  );
}
