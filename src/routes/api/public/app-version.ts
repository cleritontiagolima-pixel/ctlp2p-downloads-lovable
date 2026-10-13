import { createFileRoute } from "@tanstack/react-router";
import { REPO } from "@/lib/update";

// Latest APK build number published by the GitHub release (public, read-only).
export const Route = createFileRoute("/api/public/app-version")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const r = await fetch(`https://github.com/${REPO}/releases/latest/download/version.json`, {
            redirect: "follow",
            signal: AbortSignal.timeout(10000),
          });
          const j = r.ok ? ((await r.json()) as { build?: unknown }) : {};
          const build = Number(j.build) || 0;
          return Response.json({ build }, { headers: { "Cache-Control": "public, max-age=300" } });
        } catch {
          return Response.json({ build: 0 });
        }
      },
    },
  },
});
