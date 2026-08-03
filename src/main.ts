import { MarkdownView, Notice, Plugin } from "obsidian";
import { Prec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { MarkdownEnhancer } from "./enhancer";
import { DEFAULT_SETTINGS, normalizeSettings, type PolishedMarkdownSettings } from "./settings";
import { PolishedMarkdownSettingTab } from "./settings-tab";
import { OPT_IN_CLASS, OPT_OUT_CLASS } from "./scope";
import { t } from "./i18n";

const BODY_CLASS = "codex-style-markdown-enabled";

export default class PolishedMarkdownPlugin extends Plugin {
  settings: PolishedMarkdownSettings = { ...DEFAULT_SETTINGS };
  private enhancer: MarkdownEnhancer | null = null;

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    this.enhancer = new MarkdownEnhancer(
      () => this.settings,
      (linktext, sourcePath) => this.app.workspace.openLinkText(linktext, sourcePath, "tab")
    );
    this.addSettingTab(new PolishedMarkdownSettingTab(this.app, this));
    this.registerMarkdownPostProcessor((element, context) => this.enhancer?.enhance(element, context.sourcePath));
    this.registerEditorExtension(Prec.lowest(EditorView.theme({
      "&": { maxWidth: "none" },
      ".cm-content": { caretColor: "var(--caret-color)" }
    })));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.refreshViews()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshViews()));

    this.addCommand({
      id: "toggle-enabled",
      name: "Toggle globally",
      callback: async () => {
        await this.updateSetting("enabled", !this.settings.enabled);
        new Notice(t(this.settings.enabled ? "enabled" : "disabled"));
      }
    });
    this.addCommand({
      id: "toggle-current-note",
      name: "Toggle for current note",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view?.file) return false;
        if (!checking) void this.toggleCurrentNote(view);
        return true;
      }
    });
    this.addCommand({
      id: "toggle-all-code-blocks",
      name: "Expand or collapse all code blocks in current note",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return false;
        if (!checking) this.enhancer?.toggleAllCodeBlocks(view.containerEl);
        return true;
      }
    });

    this.applySettings();
  }

  onunload(): void {
    this.enhancer?.destroy();
    this.enhancer = null;
    document.body.classList.remove(BODY_CLASS, "polished-reading-disabled", "polished-editor-disabled", "polished-density-compact", "polished-mode-light", "polished-mode-dark", "polished-palette-graphite", "polished-palette-forest", "polished-palette-spectrum", "polished-reduce-motion");
    delete document.body.dataset.polishedActivation;
    for (const property of ["--polished-content-width", "--polished-font-family", "--polished-font-size", "--polished-line-height", "--polished-code-font-size"]) {
      document.body.style.removeProperty(property);
    }
  }

  async updateSetting<K extends keyof PolishedMarkdownSettings>(key: K, value: PolishedMarkdownSettings[K]): Promise<void> {
    await this.replaceSettings({ ...this.settings, [key]: value });
  }

  async replaceSettings(settings: PolishedMarkdownSettings): Promise<void> {
    this.settings = normalizeSettings(settings);
    await this.saveData(this.settings);
    this.applySettings();
  }

  private applySettings(): void {
    this.enhancer?.resetEnhancements();
    const body = document.body;
    body.classList.toggle(BODY_CLASS, this.settings.enabled);
    body.classList.toggle("polished-reading-disabled", !this.settings.readingViewEnabled);
    body.classList.toggle("polished-editor-disabled", !this.settings.livePreviewEnabled);
    body.classList.toggle("polished-density-compact", this.settings.density === "compact");
    body.classList.toggle("polished-mode-light", this.settings.appearanceMode === "light");
    body.classList.toggle("polished-mode-dark", this.settings.appearanceMode === "dark");
    body.classList.toggle("polished-palette-graphite", this.settings.colorPalette === "graphite");
    body.classList.toggle("polished-palette-forest", this.settings.colorPalette === "forest");
    body.classList.toggle("polished-palette-spectrum", this.settings.colorPalette === "spectrum");
    body.classList.toggle("polished-reduce-motion", this.settings.reduceMotion);
    body.dataset.polishedActivation = this.settings.activationMode;
    body.style.setProperty("--polished-content-width", `${this.settings.contentWidth}px`);
    body.style.setProperty("--polished-font-family", this.settings.fontFamily);
    body.style.setProperty("--polished-font-size", `${this.settings.fontSize}px`);
    body.style.setProperty("--polished-line-height", String(this.settings.lineHeight));
    body.style.setProperty("--polished-code-font-size", `${this.settings.codeFontSize}px`);
    this.refreshViews();
  }

  private refreshViews(): void {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) this.enhancer?.enhance(leaf.view.containerEl, leaf.view.file?.path ?? "");
    });
  }

  private async toggleCurrentNote(view: MarkdownView): Promise<void> {
    if (!view.file) return;
    const cache = this.app.metadataCache.getFileCache(view.file);
    const frontmatter: unknown = cache?.frontmatter;
    const current = frontmatter && typeof frontmatter === "object"
      ? (frontmatter as Record<string, unknown>).cssclasses
      : undefined;
    const classes = Array.isArray(current) ? current.map(String) : typeof current === "string" ? current.split(/[,\s]+/).filter(Boolean) : [];
    const target = this.settings.activationMode === "global" ? OPT_OUT_CLASS : OPT_IN_CLASS;
    const next = classes.includes(target) ? classes.filter((name) => name !== target) : [...classes.filter((name) => name !== (target === OPT_IN_CLASS ? OPT_OUT_CLASS : OPT_IN_CLASS)), target];
    await this.app.fileManager.processFrontMatter(view.file, (frontmatter: Record<string, unknown>) => {
      if (next.length) frontmatter.cssclasses = next;
      else delete frontmatter.cssclasses;
    });
    new Notice(`${t(next.includes(target) ? "added" : "removed")} ${target}.`);
  }
}
