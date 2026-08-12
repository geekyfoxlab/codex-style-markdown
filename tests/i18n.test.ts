import { afterEach, describe, expect, it } from "vitest";

import { t } from "../src/i18n";

describe("translations", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("lang");
  });

  it("uses the document language without requiring a newer Obsidian API", () => {
    document.documentElement.lang = "zh-CN";
    expect(t("reading")).toBe("阅读视图");

    document.documentElement.lang = "en-US";
    expect(t("reading")).toBe("Reading view");
  });
});
