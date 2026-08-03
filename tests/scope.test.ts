import { describe, expect, it } from "vitest";
import { shouldEnableForClasses } from "../src/scope";

describe("shouldEnableForClasses", () => {
  it("enables global notes unless explicitly disabled", () => {
    expect(shouldEnableForClasses("global", [])).toBe(true);
    expect(shouldEnableForClasses("global", ["codex-style-markdown-off"])).toBe(false);
  });

  it("requires the opt-in class in opt-in mode", () => {
    expect(shouldEnableForClasses("opt-in", [])).toBe(false);
    expect(shouldEnableForClasses("opt-in", ["codex-style-markdown-on"])).toBe(true);
  });

  it("lets the opt-out class win when both are present", () => {
    expect(shouldEnableForClasses("opt-in", ["codex-style-markdown-on", "codex-style-markdown-off"])).toBe(false);
  });
});
