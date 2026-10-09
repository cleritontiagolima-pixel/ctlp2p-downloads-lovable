import { describe, it, expect } from "vitest";
import { playableUrl } from "./stream-url";

describe("playableUrl", () => {
  it("turns Xtream live .ts links into .m3u8", () => {
    expect(playableUrl("https://srv.com/live/u/p/123.ts", true)).toBe("https://srv.com/live/u/p/123.m3u8");
  });
  it("relays http streams when the app is on https", () => {
    expect(playableUrl("http://a.com/x.m3u8", true)).toBe("/api/public/stream?url=http%3A%2F%2Fa.com%2Fx.m3u8");
  });
  it("keeps http streams direct when the app is on http", () => {
    expect(playableUrl("http://a.com/x.m3u8", false)).toBe("http://a.com/x.m3u8");
  });
});
