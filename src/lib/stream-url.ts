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
  return !/\.(mp4|mkv|webm|mp3|aac)(\?|$)/i.test(raw);
}
