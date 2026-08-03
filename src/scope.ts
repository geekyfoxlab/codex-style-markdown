import type { ActivationMode } from "./settings";

export const OPT_IN_CLASS = "codex-style-markdown-on";
export const OPT_OUT_CLASS = "codex-style-markdown-off";

export function shouldEnableForClasses(
  activationMode: ActivationMode,
  classes: Iterable<string>
): boolean {
  const names = new Set(classes);
  if (names.has(OPT_OUT_CLASS)) return false;
  return activationMode === "global" || names.has(OPT_IN_CLASS);
}

export function getMarkdownClasses(container: HTMLElement): string[] {
  const view = container.closest(".markdown-reading-view, .markdown-source-view");
  if (!view) return [...container.classList];
  return [...view.classList, ...container.classList];
}
