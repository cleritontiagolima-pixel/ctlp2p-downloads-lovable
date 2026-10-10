import { describe, expect, it } from "vitest";

import config from "../../capacitor.config";

// Domínio publicado do projeto Lovable (Publish no editor).
// A URL de preview (project--<id>.lovable.app) retorna 403 para os aparelhos —
// foi exatamente isso que quebrou o "carregando" no APK instalado.
const PUBLISHED_HOST = "ctlrevenda.lovable.app";

describe("capacitor.config.ts — URL que o APK abre", () => {
  it("aponta a WebView para o domínio publicado", () => {
    expect(config.server?.url).toBe(`https://${PUBLISHED_HOST}`);
  });

  it("usa https e o host publicado, nunca a preview project--", () => {
    const url = new URL(config.server?.url ?? "");
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe(PUBLISHED_HOST);
    expect(url.hostname).not.toMatch(/^project--/);
  });
});
