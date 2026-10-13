// Detects when GitHub has a newer APK than the one installed on this device.
// Each APK build carries its GitHub build number (versionCode); the release
// publishes the same number in version.json.
export const REPO = "cleritontiagolima-pixel/ctlp2p-downloads-lovable";
export const APK_URL = `https://github.com/${REPO}/releases/latest/download/ctlp2p-revenda.apk`;

type AppPlugin = { getInfo(): Promise<{ build?: string; version?: string }> };
type Cap = { isNativePlatform?: () => boolean; Plugins?: { App?: AppPlugin } };

export function isOutdated(installed: number, latest: number): boolean {
  return latest > 0 && installed < latest;
}

// Installed build number; 0 = APK made before update checks existed.
export async function installedBuild(): Promise<number | null> {
  const cap = (globalThis as { Capacitor?: Cap }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null; // browser: nothing to update
  try {
    const info = await cap.Plugins?.App?.getInfo();
    return Number(info?.build) || 0;
  } catch {
    return 0;
  }
}

export async function latestBuild(): Promise<number> {
  const r = await fetch("/api/public/app-version");
  if (!r.ok) return 0;
  const j = (await r.json()) as { build?: number };
  return Number(j.build) || 0;
}
