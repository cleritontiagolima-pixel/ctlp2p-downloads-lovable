export type Channel = { name: string; url: string; logo?: string | undefined; group: string };

export function parseM3U(text: string): Channel[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Channel[] = [];
  let pending: Omit<Channel, "url"> | null = null;
  for (const line of lines) {
    if (line.startsWith("#EXTINF")) {
      const attr = (k: string) => line.match(new RegExp(`${k}="([^"]*)"`))?.[1];
      const comma = line.lastIndexOf(",");
      pending = {
        name: (comma >= 0 ? line.slice(comma + 1) : "").trim() || attr("tvg-name") || "Sem nome",
        logo: attr("tvg-logo") || undefined,
        group: attr("group-title") || "Geral",
      };
    } else if (!line.startsWith("#")) {
      out.push({ ...(pending ?? { name: line, group: "Geral" }), url: line });
      pending = null;
    }
  }
  return out;
}
