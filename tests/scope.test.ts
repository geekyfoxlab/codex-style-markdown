import { describe, expect, it } from "vitest";
import { shouldEnableForClasses } from "../src/scope";

describe("shouldEnableForClasses", () => {
  it("enables global notes unless explicitly disabled", () => {
    expect(shouldEnableForClasses("global", [])).toBe(true);
    expect(shouldEnableForClasses("global", ["polished-markdown-off"])).toBe(false);
  });

  it("requires the opt-in class in opt-in mode", () => {
    expect(shouldEnableForClasses("opt-in", [])).toBe(false);
    expect(shouldEnableForClasses("opt-in", ["polished-markdown-on"])).toBe(true);
  });

  it("lets the opt-out class win when both are present", () => {
    expect(shouldEnableForClasses("opt-in", ["polished-markdown-on", "polished-markdown-off"])).toBe(false);
  });
});
