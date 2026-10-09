import type { CapacitorConfig } from "@capacitor/cli";

// The APK opens the published app, so updates go live without reinstalling.
// Native HTTP lets the device talk straight to IPTV servers (http, no CORS).
const config: CapacitorConfig = {
  appId: "br.com.ctl.p2prevenda",
  appName: "CTL P2P REVENDA",
  webDir: "capacitor-www",
  server: {
    url: "https://project--b6ed6360-0672-4234-b0b7-7c29158047c6.lovable.app",
    cleartext: true,
    androidScheme: "https",
  },
  android: { allowMixedContent: true },
  plugins: { CapacitorHttp: { enabled: true } },
};

export default config;
