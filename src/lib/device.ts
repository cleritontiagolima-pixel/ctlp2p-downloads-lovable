// Generates a stable MAC-style device ID (like IBO apps) and keeps it on the device.
const KEY = "iptv-device-mac";

export function generateMac(): string {
  const b = crypto.getRandomValues(new Uint8Array(6));
  b[0] = (b[0]! & 0xfe) | 0x02; // locally administered, unicast
  return Array.from(b, (x) => x.toString(16).padStart(2, "0").toUpperCase()).join(":");
}

export function getDeviceMac(): string {
  let mac = localStorage.getItem(KEY);
  if (!mac) {
    mac = generateMac();
    localStorage.setItem(KEY, mac);
  }
  return mac;
}
