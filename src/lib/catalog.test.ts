import { describe, it, expect } from "vitest";
import { sectionOf, decodeB64, m3uCatalog } from "./catalog";

describe("catalog", () => {
  it("sorts M3U entries into live, movies and series", () => {
    expect(sectionOf("http://s/live/u/p/1.ts")).toBe("live");
    expect(sectionOf("http://s/movie/u/p/2.mp4")).toBe("movie");
    expect(sectionOf("http://s/series/u/p/3.mkv")).toBe("series");
  });
  it("decodes base64 EPG titles with accents", () => {
    expect(decodeB64("Sm9ybmFsIE5hY2lvbmFs")).toBe("Jornal Nacional");
    expect(decodeB64(btoa(String.fromCharCode(...new TextEncoder().encode("Futebol ão"))))).toBe("Futebol ão");
  });
  it("builds categories per section from group-title", async () => {
    const c = m3uCatalog('#EXTM3U\n#EXTINF:-1 group-title="Esportes",A\nhttp://s/live/u/p/1.ts\n#EXTINF:-1 group-title="Ação",B\nhttp://s/movie/u/p/2.mp4');
    expect(await c.categories("live")).toEqual([{ id: "Esportes", name: "Esportes" }]);
    expect((await c.items("movie")).map((i) => i.name)).toEqual(["B"]);
  });
});
