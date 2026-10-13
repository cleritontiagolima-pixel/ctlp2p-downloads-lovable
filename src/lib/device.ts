// MAC-style device ID (like IBO apps), unique per device and kept on it.
// In the installed app it is derived from the Android device ID, so it stays
// the same even after reinstalling. In a browser it is random and saved locally.
const KEY = "iptv-device-mac";

export function generateMac(): string {
  const b = crypto.getRandomValues(new Uint8Array(6));
  return toMac(b);
}

export function toMac(b: Uint8Array): string {
  const x = Array.from(b.slice(0, 6));
  x[0] = (x[0]! & 0xfe) | 0x02; // locally administered, unicast
  return x.map((v) => v.toString(16).padStart(2, "0").toUpperCase()).join(":");
}

export async function macFromId(id: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ctl-p2p:${id}`)));
  return toMac(h);
}

type DevicePlugin = { getId(): Promise<{ identifier?: string; uuid?: string }> };
function devicePlugin(): DevicePlugin | undefined {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { Device?: DevicePlugin } } }).Capacitor;
  return cap?.isNativePlatform?.() ? cap.Plugins?.Device : undefined;
}

export async function getDeviceMac(): Promise<string> {
  const saved = localStorage.getItem(KEY);
  const dev = devicePlugin();
  if (dev) {
    try {
      const r = await dev.getId();
      const id = r.identifier ?? r.uuid;
      if (id) {
        const mac = await macFromId(id);
        localStorage.setItem(KEY, mac);
        return mac;
      }
    } catch { /* fall back to the saved/random one */ }
  }
  if (saved) return saved;
  const mac = generateMac();
  localStorage.setItem(KEY, mac);
  return mac;
}
