import { fetchText } from "./transport";
import { parseM3U } from "./m3u";
import { translateCategory } from "./ptCategories";
import { cached } from "./cache";

export type Section = "live" | "movie" | "series";
export type Cat = { id: string; name: string };
export type Item = { id: string; name: string; icon?: string | undefined; cat: string; ext?: string | undefined; url?: string | undefined; plot?: string | undefined; rating?: string | undefined };
export type Episode = { id: string; title: string; season: string; num: number; ext: string; icon?: string | undefined };
export type Program = { title: string; desc: string; start: number; end: number };
export type Xtream = { server: string; username: string; password: string };

export interface Catalog {
  categories(s: Section): Promise<Cat[]>;
  items(s: Section): Promise<Item[]>;
  episodes(seriesId: string): Promise<Episode[]>;
  epg(item: Item): Promise<Program[]>;
  liveUrl(item: Item): string;
  movieUrl(item: Item): string;
  episodeUrl(ep: Episode): string;
  hasEpisodes: boolean;
}

function memo<T>(fn: (k: string) => Promise<T>) {
  const cache = new Map<string, Promise<T>>();
  return (k: string) => {
    let p = cache.get(k);
    if (!p) { p = fn(k).catch((e) => { cache.delete(k); throw e; }); cache.set(k, p); }
    return p;
  };
}

export function decodeB64(s: string): string {
  try { return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0))); } catch { return s; }
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

// A panel "m3u" link like http://srv/get.php?username=U&password=P is an Xtream
// server. Using its API loads each menu separately (small, fast) instead of one
// giant file with every channel, movie and episode, which hangs weak devices.
export function xtreamFromUrl(url: string | undefined): Xtream | null {
  try {
    const l = new URL(url ?? "");
    const username = l.searchParams.get("username"), password = l.searchParams.get("password");
    if (!/\/(get|player_api)\.php$/i.test(l.pathname) || !username || !password) return null;
    return { server: l.origin + l.pathname.replace(/\/[^/]*$/, ""), username, password };
  } catch { return null; }
}

export function xtreamCatalog(x: Xtream): Catalog {
  const base = x.server.replace(/\/+$/, "");
  const u = encodeURIComponent(x.username), p = encodeURIComponent(x.password);
  const api = memo(async (q: string) => {
    const load = async () => JSON.parse(await fetchText(`${base}/player_api.php?username=${u}&password=${p}&action=${q}`)) as unknown;
    // Program guide changes all the time; the big lists are kept on the device.
    return /^get_(short_epg|simple_data_table)/.test(q) ? load() : cached(`x:${base}:${x.username}:${q}`, load);
  });
  const catAction = { live: "get_live_categories", movie: "get_vod_categories", series: "get_series_categories" };
  const itemAction = { live: "get_live_streams", movie: "get_vod_streams", series: "get_series" };
  return {
    hasEpisodes: true,
    async categories(s) {
      const rows = (await api(catAction[s])) as Row[];
      return (Array.isArray(rows) ? rows : []).map((r) => ({ id: str(r["category_id"]), name: translateCategory(str(r["category_name"])) }));
    },
    async items(s) {
      const rows = (await api(itemAction[s])) as Row[];
      return (Array.isArray(rows) ? rows : []).map((r) => ({
        id: str(s === "series" ? r["series_id"] : r["stream_id"]),
        name: str(r["name"]),
        icon: str(r["stream_icon"] ?? r["cover"]) || undefined,
        cat: str(r["category_id"]),
        ext: str(r["container_extension"]) || undefined,
        plot: str(r["plot"]) || undefined,
        rating: str(r["rating"]) || undefined,
      }));
    },
    async episodes(id) {
      const info = (await api(`get_series_info&series_id=${encodeURIComponent(id)}`)) as { episodes?: Record<string, Row[]> };
      const out: Episode[] = [];
      for (const [season, eps] of Object.entries(info.episodes ?? {}))
        for (const e of eps ?? [])
          out.push({
            id: str(e["id"]), title: str(e["title"]), season, num: Number(e["episode_num"]) || 0,
            ext: str(e["container_extension"]) || "mp4",
            icon: str((e["info"] as Row | undefined)?.["movie_image"]) || undefined,
          });
      return out.sort((a, b) => Number(a.season) - Number(b.season) || a.num - b.num);
    },
    async epg(item) {
      const id = encodeURIComponent(item.id);
      const read = (r: unknown) => ((r as { epg_listings?: Row[] } | null)?.epg_listings ?? []).map((e) => ({
        title: decodeB64(str(e["title"])), desc: decodeB64(str(e["description"])),
        start: Number(e["start_timestamp"]) * 1000, end: Number(e["stop_timestamp"] ?? e["end_timestamp"]) * 1000,
      })).filter((p) => p.title && p.end > Date.now());
      const short = read(await api(`get_short_epg&stream_id=${id}&limit=10`).catch(() => null));
      if (short.length) return short;
      // Some panels only answer the full-day table.
      return read(await api(`get_simple_data_table&stream_id=${id}`).catch(() => null))
        .sort((a, b) => a.start - b.start).slice(0, 10);
    },
    liveUrl: (i) => `${base}/live/${u}/${p}/${i.id}.m3u8`,
    movieUrl: (i) => `${base}/movie/${u}/${p}/${i.id}.${i.ext ?? "mp4"}`,
    episodeUrl: (e) => `${base}/series/${u}/${p}/${e.id}.${e.ext}`,
  };
}

export function sectionOf(url: string): Section {
  if (/\/movie\//i.test(url)) return "movie";
  if (/\/series\//i.test(url)) return "series";
  return "live";
}

export function m3uCatalog(text: string): Catalog {
  const all = parseM3U(text).map((c, i) => ({ ...c, id: String(i), section: sectionOf(c.url) }));
  const pick = (s: Section) => all.filter((c) => c.section === s);
  return {
    hasEpisodes: false,
    async categories(s) {
      return Array.from(new Set(pick(s).map((c) => c.group))).map((g) => ({ id: g, name: g }));
    },
    async items(s) {
      return pick(s).map((c) => ({ id: c.id, name: c.name, icon: c.logo, cat: c.group, url: c.url }));
    },
    async episodes() { return []; },
    async epg() { return []; },
    liveUrl: (i) => i.url ?? "",
    movieUrl: (i) => i.url ?? "",
    episodeUrl: () => "",
  };
}
