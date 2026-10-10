import { describe, it, expect } from "vitest";
import { translateCategory } from "./ptCategories";
import { parseM3U } from "./m3u";

describe("ptCategories", () => {
  it("traduz categorias comuns de listas em inglês", () => {
    expect(translateCategory("Movies")).toBe("Filmes");
    expect(translateCategory("Series")).toBe("Séries");
    expect(translateCategory("Documentary")).toBe("Documentário");
    expect(translateCategory("Sports")).toBe("Esportes");
    expect(translateCategory("Kids")).toBe("Infantil");
    expect(translateCategory("Music")).toBe("Música");
    expect(translateCategory("News")).toBe("Notícias");
  });

  it("é case-insensível e mantém acentos PT já prontos", () => {
    expect(translateCategory("movies")).toBe("Filmes");
    expect(translateCategory("FILMES")).toBe("Filmes");
    expect(translateCategory("Esportes")).toBe("Esportes");
  });

  it("preserva separadores compostos traduzindo cada parte", () => {
    expect(translateCategory("Documentary;News")).toBe("Documentário;Notícias");
    expect(translateCategory("General;Lifestyle;Music;News")).toBe(
      "Geral;Estilo de Vida;Música;Notícias",
    );
  });

  it("devolve 'Geral' para vazio e mantém desconhecido como está", () => {
    expect(translateCategory("")).toBe("Geral");
    expect(translateCategory("Canal Top")).toBe("Canal Top");
  });

  it("aplica a tradução no parser M3U (alimenta TV, filmes e séries)", () => {
    const channels = parseM3U(
      '#EXTM3U\n#EXTINF:-1 group-title="Documentary;News",A\nhttp://s/live/u/p/1.ts',
    );
    expect(channels[0]!.group).toBe("Documentário;Notícias");
  });
});
