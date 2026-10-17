import Hls from "hls.js";
import type { LoaderCallbacks, LoaderConfiguration, LoaderContext, PlaylistLoaderContext } from "hls.js";
import { nativeHttp } from "./transport";

// In the APK, playlists are fetched with native HTTP so hls.js learns the FINAL
// url after the IPTV server's redirect. Without it, relative segment paths were
// resolved against the app's own site and the player sat "buffering" forever.
const Base = Hls.DefaultConfig.loader;

export class NativePlaylistLoader extends Base {
  override load(context: LoaderContext, config: LoaderConfiguration, callbacks: LoaderCallbacks<LoaderContext>) {
    const n = nativeHttp();
    if (!n) return super.load(context, config, callbacks);
    const stats = this.stats;
    stats.loading.start = performance.now();
    let done = false;
    const timer = setTimeout(() => {
      if (done) return; done = true;
      callbacks.onTimeout(stats, context, null);
    }, 15000);
    n.get({ url: context.url, responseType: "text" }).then((r) => {
      if (done || this.stats.aborted) return; done = true; clearTimeout(timer);
      const data = typeof r.data === "string" ? r.data : String(r.data ?? "");
      const now = performance.now();
      stats.loading.first = stats.loading.end = now;
      stats.loaded = stats.total = data.length;
      if (r.status >= 200 && r.status < 300 && data.includes("#EXT"))
        callbacks.onSuccess({ url: r.url || context.url, data }, stats, context, null);
      else callbacks.onError({ code: r.status || 0, text: "Indisponível" }, context, null, stats);
    }).catch(() => {
      if (done) return; done = true; clearTimeout(timer);
      callbacks.onError({ code: 0, text: "Falha de rede" }, context, null, stats);
    });
  }
}

export type { PlaylistLoaderContext };
