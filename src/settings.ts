export type ActivationMode = "global" | "opt-in";
export type Density = "comfortable" | "compact";
export type AppearanceMode = "auto" | "light" | "dark";
export type ColorPalette = "graphite" | "forest" | "spectrum";

export interface PolishedMarkdownSettings {
  enabled: boolean;
  activationMode: ActivationMode;
  readingViewEnabled: boolean;
  livePreviewEnabled: boolean;
  defaultToReadingView: boolean;
  openInternalLinksInNewTab: boolean;
  contentWidth: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  density: Density;
  appearanceMode: AppearanceMode;
  colorPalette: ColorPalette;
  codeFontSize: number;
  showCodeLanguage: boolean;
  showCodeCopyButton: boolean;
  showTableCopyButton: boolean;
  showTableToolbar: boolean;
  showMermaidToolbar: boolean;
  showLineNumbers: boolean;
  collapseLongCode: boolean;
  collapseThreshold: number;
  imageLightbox: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Readonly<PolishedMarkdownSettings> = {
  enabled: true,
  activationMode: "global",
  readingViewEnabled: true,
  livePreviewEnabled: true,
  defaultToReadingView: true,
  openInternalLinksInNewTab: true,
  contentWidth: 740,
  fontFamily: "var(--font-text)",
  fontSize: 16,
  lineHeight: 1.65,
  density: "comfortable",
  appearanceMode: "auto",
  colorPalette: "graphite",
  codeFontSize: 13,
  showCodeLanguage: true,
  showCodeCopyButton: true,
  showTableCopyButton: true,
  showTableToolbar: true,
  showMermaidToolbar: true,
  showLineNumbers: false,
  collapseLongCode: true,
  collapseThreshold: 24,
  imageLightbox: true,
  reduceMotion: false
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export function normalizeSettings(data: unknown): PolishedMarkdownSettings {
  const input = data && typeof data === "object"
    ? (data as Partial<PolishedMarkdownSettings> & { codeTheme?: AppearanceMode; showCopyButton?: boolean })
    : {};
  const activationMode: ActivationMode = input.activationMode === "opt-in" ? "opt-in" : "global";
  const density: Density = input.density === "compact" ? "compact" : "comfortable";
  const requestedAppearance = input.appearanceMode ?? input.codeTheme;
  const appearanceMode: AppearanceMode = requestedAppearance === "light" || requestedAppearance === "dark" ? requestedAppearance : "auto";
  const colorPalette: ColorPalette = input.colorPalette === "forest" || input.colorPalette === "spectrum" ? input.colorPalette : "graphite";
  const legacyCopy = typeof input.showCopyButton === "boolean" ? input.showCopyButton : true;
  const cleanInput = { ...input } as Record<string, unknown>;
  delete cleanInput.codeTheme;
  delete cleanInput.showCopyButton;

  return {
    ...DEFAULT_SETTINGS,
    ...(cleanInput as Partial<PolishedMarkdownSettings>),
    activationMode,
    density,
    appearanceMode,
    colorPalette,
    showCodeCopyButton: typeof input.showCodeCopyButton === "boolean" ? input.showCodeCopyButton : legacyCopy,
    showTableCopyButton: typeof input.showTableCopyButton === "boolean" ? input.showTableCopyButton : legacyCopy,
    showMermaidToolbar: typeof input.showMermaidToolbar === "boolean" ? input.showMermaidToolbar : true,
    contentWidth: clamp(Number(input.contentWidth ?? DEFAULT_SETTINGS.contentWidth), 520, 1200),
    fontSize: clamp(Number(input.fontSize ?? DEFAULT_SETTINGS.fontSize), 13, 22),
    lineHeight: clamp(Number(input.lineHeight ?? DEFAULT_SETTINGS.lineHeight), 1.35, 2.1),
    codeFontSize: clamp(Number(input.codeFontSize ?? DEFAULT_SETTINGS.codeFontSize), 10, 20),
    collapseThreshold: Math.round(clamp(Number(input.collapseThreshold ?? DEFAULT_SETTINGS.collapseThreshold), 8, 200)),
    fontFamily: typeof input.fontFamily === "string" && input.fontFamily.trim() ? input.fontFamily.trim() : DEFAULT_SETTINGS.fontFamily
  };
}
