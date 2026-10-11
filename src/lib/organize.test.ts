import { describe, it, expect } from "vitest";
import { organizeLive, brandOf } from "./organize";
import { translateCategory } from "./ptCategories";

const it_ = (id: string, name: string, cat: string) => ({ id, name, cat });

describe("organizeLive", () => {
  it("puts every Globo regional in one Globo group, HBO Max apart from HBO", () => {
    const r = organizeLive([{ id: "1", name: "Canais BR" }, { id: "2", name: "Canais|XXX +18" }], [
      it_("a", "Globo SP", "1"), it_("b", "Globo RJ", "1"), it_("c", "HBO", "1"), it_("d", "HBO 2", "1"),
      it_("e", "HBO Max 1", "1"), it_("f", "HBO MAX 2", "1"), it_("g", "Globo Adult", "2"), it_("h", "Canal X", "1"),
    ]);
    const cat = (id: string) => r.items.find((i) => i.id === id)!.cat;
    expect(cat("a")).toBe("brand:Globo");
    expect(cat("b")).toBe("brand:Globo");
    expect(cat("c")).toBe("brand:HBO");
    expect(cat("e")).toBe("brand:HBO Max");
    expect(cat("g")).toBe("2");
    expect(cat("h")).toBe("1");
    expect(r.cats.map((c) => c.name)).toEqual(["HBO Max", "HBO", "Globo", "Canais BR", "Canais|XXX +18"]);
  });
  it("GloboNews and SporTV are not mixed into Globo", () => {
    expect(brandOf("GloboNews HD")).toBe("GloboNews");
    expect(brandOf("SporTV 2")).toBe("SporTV");
    expect(brandOf("RPC Curitiba")).toBe("Globo");
  });
});

describe("Spanish/English list categories", () => {
  it("translates them to Portuguese", () => {
    expect(translateCategory("Canales|Deportes")).toBe("Latinos | Esportes");
    expect(translateCategory("Canales|Peliculas y Series")).toBe("Latinos | Filmes e Séries");
    expect(translateCategory("Channels|USA")).toBe("Internacional | EUA");
    expect(translateCategory("Canal|France")).toBe("Internacional | França");
  });
});
