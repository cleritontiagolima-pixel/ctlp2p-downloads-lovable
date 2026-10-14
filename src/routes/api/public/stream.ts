import { createFileRoute } from "@tanstack/react-router";

// Relays http streams so they play inside the https app (browsers block http video there).
// HLS manifests are rewritten so every segment also goes through this relay.
export const Route = createFileRoute("/api/public/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("url") ?? "";
        if (!/^https?:\/\//i.test(target)) return new Response("URL inválida", { status: 400 });
        const r = await fetch(target, { headers: { "User-Agent": "CTL-P2P-REVENDA/1.0" }, redirect: "follow" });
        // Refusals ("Access denied") must not be rewritten as if they were a playlist.
        if (!r.ok) return new Response("Indisponível", { status: r.status, headers: { "Cache-Control": "no-store" } });
        const type = r.headers.get("content-type") ?? "";
        const base = r.url || target;
        if (/mpegurl/i.test(type) || /\.m3u8(\?|$)/i.test(base)) {
          const body = (await r.text())
            .split(/\r?\n/)
            .map((l) => {
              const t = l.trim();
              const wrap = (u: string) => `/api/public/stream?url=${encodeURIComponent(new URL(u, base).href)}`;
              if (t && !t.startsWith("#")) return wrap(t);
              return l.replace(/URI="([^"]+)"/g, (_m, u: string) => `URI="${wrap(u)}"`);
            })
            .join("\n");
          return new Response(body, { status: r.status, headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-cache" } });
        }
        return new Response(r.body, { status: r.status, headers: { "Content-Type": type || "video/mp2t", "Cache-Control": "no-cache" } });
      },
    },
  },
});
