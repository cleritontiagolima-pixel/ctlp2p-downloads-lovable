import { createFileRoute } from "@tanstack/react-router";

// Upstream refusals are expected (IPTV servers block datacenter IPs), so they are
// returned as 200 + X-Relay-Error instead of a 5xx; the client reads the header.
const refused = (msg: string) =>
  new Response(msg, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Relay-Error": "1", "Cache-Control": "no-store" } });

// Relay for list/catalog requests when the device cannot reach the server directly.
export const Route = createFileRoute("/api/public/playlist")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("url") ?? "";
        if (!/^https?:\/\//i.test(target)) return new Response("URL inválida", { status: 400 });
        try {
          const r = await fetch(target, { headers: { "User-Agent": "CTL-P2P-REVENDA/1.0" }, signal: AbortSignal.timeout(20000) });
          const text = await r.text();
          if (!r.ok || /^\s*</.test(text)) return refused("O servidor da lista recusou a conexão por este caminho. Use o app instalado (APK).");
          return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
        } catch {
          return refused("Falha ao conectar ao servidor da lista");
        }
      },
    },
  },
});
