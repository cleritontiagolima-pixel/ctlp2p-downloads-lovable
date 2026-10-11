import { createFileRoute } from "@tanstack/react-router";

// Playback troubleshooting assistant: streams AI suggestions (SSE passthrough).
const SYSTEM = `Você é o suporte técnico do app IPTV "CTL P2P REVENDA" (Android, TV Box, Fire TV, navegador).
O revendedor descreve um problema de reprodução. Responda em português do Brasil, curto e prático:
1) Causas prováveis (em ordem de chance). 2) Passo a passo para resolver. 3) Quando contatar o servidor da lista.
Considere: internet lenta/Wi-Fi, servidor IPTV fora do ar ou bloqueando, assinatura vencida no painel, MAC não liberado,
canal offline, formato de vídeo, app desatualizado (fechar e abrir de novo), relógio do aparelho errado.`;

export const Route = createFileRoute("/api/public/diagnose")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { problem?: unknown };
        const problem = typeof body.problem === "string" ? body.problem.trim() : "";
        if (problem.length < 5 || problem.length > 1500)
          return Response.json({ error: "Descreva o problema (5 a 1500 caracteres)." }, { status: 400 });
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return Response.json({ error: "Assistente não configurado." }, { status: 500 });
        const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          signal: request.signal,
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            input: [
              { role: "system", content: SYSTEM },
              { role: "user", content: problem },
            ],
            stream: true,
            store: false,
            reasoning: { effort: "low", summary: "auto" },
            include: ["reasoning.encrypted_content"],
          }),
        });
        if (!r.ok) {
          const t = await r.text();
          console.error(`AI Gateway [${r.status}]: ${t}`);
          const msg = r.status === 429 ? "Muitas consultas agora. Tente em instantes."
            : r.status === 402 ? "Créditos de IA esgotados no workspace."
            : "Assistente indisponível no momento.";
          return Response.json({ error: msg }, { status: r.status });
        }
        return new Response(r.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
      },
    },
  },
});
