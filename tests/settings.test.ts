import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("normalizeSettings", () => {
  it("returns defaults for missing data", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("preserves valid values", () => {
    const settings = normalizeSettings({ activationMode: "opt-in", density: "compact", appearanceMode: "dark", colorPalette: "spectrum" });
    expect(settings.activationMode).toBe("opt-in");
    expect(settings.density).toBe("compact");
    expect(settings.appearanceMode).toBe("dark");
    expect(settings.colorPalette).toBe("spectrum");
  });

  it("clamps numeric values to supported boundaries", () => {
    const settings = normalizeSettings({ contentWidth: 2000, fontSize: 2, lineHeight: 9, codeFontSize: 50, collapseThreshold: 2 });
    expect(settings.contentWidth).toBe(1200);
    expect(settings.fontSize).toBe(13);
    expect(settings.lineHeight).toBe(2.1);
    expect(settings.codeFontSize).toBe(20);
    expect(settings.collapseThreshold).toBe(8);
  });

  it("falls back for invalid enums and empty fonts", () => {
    const settings = normalizeSettings({ activationMode: "broken", appearanceMode: "blue", colorPalette: "pink", fontFamily: "  " });
    expect(settings.activationMode).toBe("global");
    expect(settings.appearanceMode).toBe("auto");
    expect(settings.colorPalette).toBe("graphite");
    expect(settings.fontFamily).toBe(DEFAULT_SETTINGS.fontFamily);
  });

  it("migrates legacy theme and shared copy settings", () => {
    const settings = normalizeSettings({ codeTheme: "light", showCopyButton: false });
    expect(settings.appearanceMode).toBe("light");
    expect(settings.showCodeCopyButton).toBe(false);
    expect(settings.showTableCopyButton).toBe(false);
    expect("codeTheme" in settings).toBe(false);
    expect("showCopyButton" in settings).toBe(false);
  });
});
