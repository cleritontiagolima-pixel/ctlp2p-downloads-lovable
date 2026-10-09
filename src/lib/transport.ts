// Loads list/catalog data. Order matters: IPTV servers often block datacenter IPs,
// so the request must come from the customer's own device whenever possible.
// 1) Native app (Capacitor APK): native HTTP, no CORS/mixed-content limits.
// 2) Browser: direct fetch when allowed. 3) Last resort: server relay.
type NativeHttp = {
  get(o: { url: string; responseType?: string }): Promise<{ status: number; data: unknown }>;
};

type CapacitorGlobal = {
  Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { CapacitorHttp?: NativeHttp } };
};

function nativeHttp(): NativeHttp | undefined {
  const cap = (globalThis as unknown as CapacitorGlobal).Capacitor;
  return cap?.isNativePlatform?.() ? cap.Plugins?.CapacitorHttp : undefined;
}

export const isNativeApp = () => !!nativeHttp();

export async function fetchText(url: string): Promise<string> {
  const n = nativeHttp();
  if (n) {
    const r = await n.get({ url, responseType: "text" });
    if (r.status >= 200 && r.status < 300) return typeof r.data === "string" ? r.data : JSON.stringify(r.data);
    throw new Error(`Servidor respondeu ${r.status}`);
  }
  const blocked = location.protocol === "https:" && url.startsWith("http://");
  if (!blocked) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.text();
    } catch { /* CORS or network — try relay */ }
  }
  const r = await fetch(`/api/public/playlist?url=${encodeURIComponent(url)}`);
  const text = await r.text();
  if (!r.ok || /^\s*</.test(text)) throw new Error(friendly(r.ok ? 200 : r.status, text));
  return text;
}

// Never show raw server/HTML errors to the customer.
export function friendly(status: number, text: string): string {
  if (!/^\s*</.test(text) && text && text.length < 200) return text;
  return status === 502 || status === 504 || status === 522
    ? "Não foi possível conectar ao servidor da lista neste navegador. No app instalado (APK) o conteúdo abre normalmente."
    : "Não foi possível carregar o conteúdo. Tente novamente.";
}
