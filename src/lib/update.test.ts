import { describe, expect, it } from "vitest";
import { isOutdated } from "./update";

describe("aviso de atualização do APK", () => {
  it("pede atualização quando o GitHub tem build mais nova", () => {
    expect(isOutdated(13, 14)).toBe(true);
  });
  it("APK antigo sem número de build também é avisado", () => {
    expect(isOutdated(0, 14)).toBe(true);
  });
  it("não avisa quando já está na última build", () => {
    expect(isOutdated(14, 14)).toBe(false);
  });
  it("não avisa se não conseguiu saber a última build", () => {
    expect(isOutdated(5, 0)).toBe(false);
  });
});
