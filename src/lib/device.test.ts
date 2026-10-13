import { describe, it, expect } from "vitest";
import { generateMac } from "./device";

describe("generateMac", () => {
  it("returns MAC format XX:XX:XX:XX:XX:XX", () => {
    expect(generateMac()).toMatch(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/);
  });
});

import { macFromId } from "./device";
describe("macFromId", () => {
  it("gives the same MAC for the same device and different MACs for different devices", async () => {
    const a = await macFromId("android-abc");
    expect(a).toBe(await macFromId("android-abc"));
    expect(a).not.toBe(await macFromId("android-xyz"));
    expect(a).toMatch(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/);
  });
});
