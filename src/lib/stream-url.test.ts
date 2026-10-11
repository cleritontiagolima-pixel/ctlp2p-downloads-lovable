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

import { playbackPlan } from "./stream-url";
describe("playbackPlan", () => {
  it("in the app, plays live HLS with the video element first, then hls.js, then the original .ts", () => {
    expect(playbackPlan("http://s.com/live/u/p/1.ts", true, true, true)).toEqual([
      { url: "http://s.com/live/u/p/1.m3u8", engine: "element" },
      { url: "http://s.com/live/u/p/1.m3u8", engine: "hls" },
      { url: "http://s.com/live/u/p/1.ts", engine: "element" },
    ]);
  });
  it("in the app, movies play directly in the video element", () => {
    expect(playbackPlan("http://s.com/movie/u/p/9.mkv", true, true, false)).toEqual([{ url: "http://s.com/movie/u/p/9.mkv", engine: "element" }]);
  });
  it("in the browser, http live goes through the relay with hls.js", () => {
    expect(playbackPlan("http://s.com/x.m3u8", true, false, false)).toEqual([{ url: "/api/public/stream?url=http%3A%2F%2Fs.com%2Fx.m3u8", engine: "hls" }]);
  });
});
