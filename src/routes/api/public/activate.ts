import { createFileRoute } from "@tanstack/react-router";

// Asks the CTL panel (POST {PANEL_URL}/partner/check-mac, X-API-Key header) whether
// a MAC is active and returns only what the player needs. The key never leaves the server.
const MESSAGES: Record<string, string> = {
  not_found: "Aguardando liberação no painel",
  inactive: "Assinatura inativa",
  blocked: "Aparelho bloqueado",
  expired: "Assinatura vencida",
  out_of_scope: "MAC cadastrado em outro aplicativo",
  device_conflict: "MAC já está em uso em outro aparelho",
  device_in_use: "MAC já está em uso em outro aparelho",
};

export const Route = createFileRoute("/api/public/activate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const mac = new URL(request.url).searchParams.get("mac") ?? "";
        if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac))
          return Response.json({ active: false, error: "MAC inválido" }, { status: 400 });
        const base = (process.env["PANEL_URL"] ?? "").replace(/\/+$/, "");
        const key = process.env["PANEL_API_KEY"];
        if (!base || !key) return Response.json({ active: false, error: "Painel não configurado" });
        try {
          const r = await fetch(`${base}/partner/check-mac`, {
            method: "POST",
            headers: { "X-API-Key": key, "Content-Type": "application/json", "User-Agent": "CTL-P2P-REVENDA/1.0" },
            body: JSON.stringify({ mac_address: mac, device_id: mac }),
          });
          const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
          if (r.status === 429) return Response.json({ active: false, error: "Muitas tentativas, aguarde..." });
          if (!r.ok || j["active"] !== true) {
            const code = String(j["code"] ?? "");
            return Response.json({ active: false, error: MESSAGES[code] ?? "Aguardando liberação no painel" });
          }
          let url = typeof j["m3u_url"] === "string" ? j["m3u_url"] : "";
          const srv = j["xtream_server_url"], u = j["xtream_username"], p = j["xtream_password"];
          if (!url && typeof srv === "string" && typeof u === "string" && typeof p === "string")
            url = `${srv.replace(/\/+$/, "")}/get.php?username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}&type=m3u_plus&output=m3u8`;
          if (!url) return Response.json({ active: false, error: "Lista não configurada no painel" });
          const xtream = typeof srv === "string" && typeof u === "string" && typeof p === "string" ? { server: srv, username: u, password: p } : null;
          return Response.json({ active: true, url, xtream, expires: j["expiration_date"] ?? null });
        } catch {
          return Response.json({ active: false, error: "Painel indisponível. Tentando novamente..." });
        }
      },
    },
  },
});
