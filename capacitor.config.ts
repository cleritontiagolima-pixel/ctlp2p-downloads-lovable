import type { CapacitorConfig } from "@capacitor/cli";

// The APK opens the published app, so updates go live without reinstalling.
// Native HTTP lets the device talk straight to IPTV servers (http, no CORS).
const config: CapacitorConfig = {
  appId: "br.com.ctl.p2prevenda",
  appName: "CTL P2P REVENDA",
  webDir: "capacitor-www",
  server: {
    // Published domain: the project-- preview URL returns 403 to the device,
    // which is what broke loading on installed APKs.
    url: "https://ctlrevenda.lovable.app",
    cleartext: true,
    androidScheme: "https",
  },
  android: { allowMixedContent: true },
  plugins: { CapacitorHttp: { enabled: true } },
};

export default config;
