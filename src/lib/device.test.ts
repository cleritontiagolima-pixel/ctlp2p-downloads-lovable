import { describe, it, expect } from "vitest";
import { generateMac } from "./device";

describe("generateMac", () => {
  it("returns MAC format XX:XX:XX:XX:XX:XX", () => {
    expect(generateMac()).toMatch(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/);
  });
});
