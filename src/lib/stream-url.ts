// Picks the best playable URL for a channel inside the browser.
export function playableUrl(raw: string, pageIsHttps: boolean, native = false): string {
  let url = raw.trim();
  // Xtream-style live .ts links: the same server offers HLS, which browsers can play
  if (/\/live\/[^/]+\/[^/]+\/\d+\.ts(\?|$)/i.test(url)) url = url.replace(/\.ts(\?|$)/i, ".m3u8$1");
  if (native) return url;
  if (pageIsHttps && url.startsWith("http://")) return `/api/public/stream?url=${encodeURIComponent(url)}`;
  return url;
}

export function isHlsUrl(raw: string): boolean {
  return !/\.(mp4|mkv|webm|mp3|aac|ts|avi)(\?|$)/i.test(raw);
}

export type Attempt = { url: string; engine: "element" | "hls" };

// Ordered list of ways to play a stream; the player moves to the next one when
// an attempt fails. In the installed app the <video> element is tried first:
// it loads http media directly (no CORS), while hls.js requests are blocked by
// IPTV servers that send no CORS headers.
export function playbackPlan(raw: string, pageIsHttps: boolean, native: boolean, nativeHls: boolean): Attempt[] {
  const src = raw.trim();
  const url = playableUrl(src, pageIsHttps, native);
  const out: Attempt[] = [];
  const add = (a: Attempt) => { if (!out.some((o) => o.url === a.url && o.engine === a.engine)) out.push(a); };
  if (!isHlsUrl(url)) add({ url, engine: "element" });
  else if (native) {
    if (nativeHls) add({ url, engine: "element" });
    add({ url, engine: "hls" });
    if (src !== url) add({ url: src, engine: "element" }); // original .ts link
  } else add({ url, engine: "hls" });
  return out;
}
