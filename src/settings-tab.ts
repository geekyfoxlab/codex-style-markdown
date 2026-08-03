import { PluginSettingTab, Setting } from "obsidian";
import type { App } from "obsidian";
import type PolishedMarkdownPlugin from "./main";
import { DEFAULT_SETTINGS } from "./settings";
import { t } from "./i18n";

type BooleanSettingKey = "enabled" | "readingViewEnabled" | "livePreviewEnabled" | "showCodeLanguage" | "showCodeCopyButton" | "showTableCopyButton" | "showMermaidToolbar" | "showLineNumbers" | "collapseLongCode" | "imageLightbox" | "reduceMotion";
type NumberSettingKey = "contentWidth" | "fontSize" | "lineHeight" | "codeFontSize" | "collapseThreshold";

export class PolishedMarkdownSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: PolishedMarkdownPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName(t("title")).setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: t("intro")
    });

    this.toggle(t("enable"), t("enableDesc"), "enabled");
    new Setting(containerEl)
      .setName(t("activation"))
      .setDesc(t("activationDesc"))
      .addDropdown((control) => control
        .addOption("global", t("global"))
        .addOption("opt-in", t("optIn"))
        .setValue(this.plugin.settings.activationMode)
        .onChange(async (value) => this.plugin.updateSetting("activationMode", value === "opt-in" ? "opt-in" : "global")));
    this.toggle(t("reading"), t("readingDesc"), "readingViewEnabled");
    this.toggle(t("livePreview"), t("livePreviewDesc"), "livePreviewEnabled");

    new Setting(containerEl).setName(t("appearance")).setHeading();
    new Setting(containerEl).setName(t("appearanceMode")).setDesc(t("appearanceModeDesc")).addDropdown((control) => control
      .addOption("auto", t("auto")).addOption("light", t("light")).addOption("dark", t("dark"))
      .setValue(this.plugin.settings.appearanceMode)
      .onChange(async (value) => this.plugin.updateSetting("appearanceMode", value === "light" || value === "dark" ? value : "auto")));
    const paletteSetting = new Setting(containerEl).setName(t("palette")).setDesc(t("paletteDesc"));
    for (const palette of ["graphite", "forest", "spectrum"] as const) {
      paletteSetting.addButton((button) => {
        button.setTooltip(t(palette));
        button.buttonEl.addClass("polished-palette-swatch", `is-${palette}`);
        button.buttonEl.classList.toggle("is-active", this.plugin.settings.colorPalette === palette);
        button.buttonEl.setAttribute("aria-label", t(palette));
        button.buttonEl.createSpan({ cls: "polished-palette-swatch-colors" });
        button.onClick(async () => {
          await this.plugin.updateSetting("colorPalette", palette);
          this.display();
        });
      });
    }

    new Setting(containerEl).setName(t("typography")).setHeading();
    this.slider(t("width"), t("widthDesc"), "contentWidth", 520, 1200, 20);
    this.text(t("font"), t("fontDesc"), "fontFamily");
    this.slider(t("fontSize"), t("fontSizeDesc"), "fontSize", 13, 22, 1);
    this.slider(t("lineHeight"), t("lineHeightDesc"), "lineHeight", 1.35, 2.1, 0.05);
    new Setting(containerEl).setName(t("density")).addDropdown((control) => control
      .addOption("comfortable", t("comfortable"))
      .addOption("compact", t("compact"))
      .setValue(this.plugin.settings.density)
      .onChange(async (value) => this.plugin.updateSetting("density", value === "compact" ? "compact" : "comfortable")));

    new Setting(containerEl).setName(t("code")).setHeading();
    this.slider(t("codeSize"), t("codeSizeDesc"), "codeFontSize", 10, 20, 1);
    this.toggle(t("language"), t("languageDesc"), "showCodeLanguage");
    this.toggle(t("codeCopy"), t("codeCopyDesc"), "showCodeCopyButton");
    this.toggle(t("lineNumbers"), t("lineNumbersDesc"), "showLineNumbers");
    this.toggle(t("collapse"), t("collapseDesc"), "collapseLongCode");
    this.slider(t("threshold"), t("thresholdDesc"), "collapseThreshold", 8, 200, 1);

    new Setting(containerEl).setName(t("richContent")).setHeading();
    this.toggle(t("tableCopy"), t("tableCopyDesc"), "showTableCopyButton");
    this.toggle(t("mermaidToolbar"), t("mermaidToolbarDesc"), "showMermaidToolbar");
    this.toggle(t("lightbox"), t("lightboxDesc"), "imageLightbox");
    this.toggle(t("motion"), t("motionDesc"), "reduceMotion");

    new Setting(containerEl).setName(t("restore")).setDesc(t("restoreDesc")).addButton((button) => button
      .setButtonText(t("restoreButton"))
      .setWarning()
      .onClick(async () => {
        await this.plugin.replaceSettings({ ...DEFAULT_SETTINGS });
        this.display();
      }));
  }

  private toggle(name: string, description: string, key: BooleanSettingKey): void {
    new Setting(this.containerEl).setName(name).setDesc(description).addToggle((control) => control
      .setValue(this.plugin.settings[key])
      .onChange(async (value) => this.plugin.updateSetting(key, value)));
  }

  private slider(name: string, description: string, key: NumberSettingKey, min: number, max: number, step: number): void {
    const current = this.plugin.settings[key];
    new Setting(this.containerEl).setName(name).setDesc(description).addSlider((control) => control
      .setLimits(min, max, step).setValue(current).setDynamicTooltip()
      .onChange(async (value) => this.plugin.updateSetting(key, value)));
  }

  private text(name: string, description: string, key: "fontFamily"): void {
    new Setting(this.containerEl).setName(name).setDesc(description).addText((control) => control
      .setValue(this.plugin.settings[key])
      .onChange(async (value) => this.plugin.updateSetting(key, value)));
  }
}
