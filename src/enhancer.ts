import { getIcon } from "obsidian";
import type { PolishedMarkdownSettings } from "./settings";
import { getMarkdownClasses, shouldEnableForClasses } from "./scope";

const PROCESSED = "data-polished-processed";
const WRAPPER_CLASS = "polished-code-block";
const MERMAID_BLOCK_CLASS = "polished-mermaid-block";
const MIN_MERMAID_SCALE = 0.5;

export function detectCodeLanguage(pre: HTMLPreElement): string {
  const code = pre.querySelector("code");
  const languageClass = [...(code?.classList ?? [])].find((name) => name.startsWith("language-"));
  return languageClass?.slice("language-".length).trim() || "text";
}

export function countCodeLines(pre: HTMLPreElement): number {
  const text = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
  return text.length === 0 ? 0 : text.replace(/\n$/, "").split("\n").length;
}

export function isEnhanceableCodeBlock(pre: HTMLPreElement): boolean {
  return !pre.closest(".frontmatter-container, .mod-frontmatter, .mermaid-guard-source");
}

export function tableToMarkdown(table: HTMLTableElement): string {
  const readNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.instanceOf(HTMLElement) && node.tagName === "BR") return "\n";
    return [...node.childNodes].map(readNode).join("");
  };
  const rows = [...table.rows].map((row) =>
    [...row.cells].map((cell) =>
      readNode(cell)
        .replace(/\s*\n\s*/g, "<br>")
        .replace(/\|/g, "\\|")
        .replace(/[ \t]+/g, " ")
        .trim()
    )
  );
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((row) => row.length));
  const normalize = (row: string[]): string[] => Array.from({ length: width }, (_, index) => row[index] ?? "");
  const line = (row: string[]): string => `| ${normalize(row).join(" | ")} |`;
  return [line(rows[0] ?? []), line(Array.from({ length: width }, () => "---")), ...rows.slice(1).map(line)].join("\n");
}

export function clampMermaidScale(scale: number): number {
  return Math.max(MIN_MERMAID_SCALE, scale);
}

export function getMermaidSize(mermaid: HTMLElement): { width: number; height: number } {
  const svg = mermaid.querySelector("svg");
  const viewBox = svg?.getAttribute("viewBox")?.trim().split(/\s+/).map(Number);
  const width = viewBox?.length === 4 && Number.isFinite(viewBox[2]) ? viewBox[2]! : Number(svg?.getAttribute("width")) || 640;
  const height = viewBox?.length === 4 && Number.isFinite(viewBox[3]) ? viewBox[3]! : Number(svg?.getAttribute("height")) || 360;
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

export class MarkdownEnhancer {
  private readonly cleanupCallbacks = new Set<() => void>();
  private readonly observers = new Map<HTMLElement, MutationObserver>();
  private lightbox: HTMLElement | null = null;
  private lightboxTrigger: HTMLElement | null = null;

  constructor(
    private readonly getSettings: () => PolishedMarkdownSettings,
    private readonly openLinkInNewTab: (linktext: string, sourcePath: string) => Promise<void> = () => Promise.resolve()
  ) {}

  enhance(container: HTMLElement, sourcePath = ""): void {
    const settings = this.getSettings();
    const roots = this.findRoots(container);
    for (const root of roots) {
      const enabled = settings.enabled && shouldEnableForClasses(settings.activationMode, getMarkdownClasses(root));
      root.classList.toggle("codex-style-markdown-active", enabled);
      if (!enabled) continue;
      if (sourcePath) root.dataset.polishedSourcePath = sourcePath;
      if (root.matches(".markdown-reading-view, .markdown-preview-view") && settings.readingViewEnabled) {
        this.enhanceRenderedContent(root, settings);
      }
    }
  }

  toggleAllCodeBlocks(container: HTMLElement): void {
    const blocks = [...container.querySelectorAll<HTMLElement>(`.${WRAPPER_CLASS}.is-collapsible`)];
    const shouldCollapse = blocks.some((block) => !block.classList.contains("is-collapsed"));
    for (const block of blocks) {
      block.classList.toggle("is-collapsed", shouldCollapse);
      const button = block.querySelector<HTMLButtonElement>(".polished-code-toggle");
      this.updateToggleButton(button, shouldCollapse);
    }
  }

  destroy(): void {
    this.resetEnhancements();
    for (const root of document.querySelectorAll<HTMLElement>(".codex-style-markdown-active")) {
      root.classList.remove("codex-style-markdown-active");
      delete root.dataset.polishedSourcePath;
    }
  }

  resetEnhancements(): void {
    for (const observer of this.observers.values()) observer.disconnect();
    this.observers.clear();
    for (const cleanup of this.cleanupCallbacks) cleanup();
    this.cleanupCallbacks.clear();
    this.closeLightbox();
    for (const wrapper of document.querySelectorAll<HTMLElement>(`.${MERMAID_BLOCK_CLASS}`)) {
      const mermaid = wrapper.querySelector<HTMLElement>(":scope .mermaid");
      if (mermaid) {
        mermaid.style.removeProperty("transform");
        mermaid.style.removeProperty("transform-origin");
        wrapper.parentNode?.insertBefore(mermaid, wrapper);
      }
      wrapper.remove();
    }
    for (const wrapper of document.querySelectorAll<HTMLElement>(`.${WRAPPER_CLASS}`)) {
      const pre = wrapper.querySelector<HTMLPreElement>(":scope > pre");
      const mermaid = wrapper.querySelector<HTMLElement>(".mermaid");
      pre?.querySelector(".polished-line-numbers")?.remove();
      if (pre && wrapper.parentNode) wrapper.parentNode.insertBefore(pre, wrapper);
      else if (mermaid && wrapper.parentNode) wrapper.parentNode.insertBefore(mermaid, wrapper);
      wrapper.remove();
    }
    for (const wrapper of document.querySelectorAll<HTMLElement>(".polished-table-scroll")) {
      const table = wrapper.querySelector<HTMLTableElement>(":scope > table");
      if (table && wrapper.parentNode) wrapper.parentNode.insertBefore(table, wrapper);
      wrapper.remove();
    }
  }

  private findRoots(container: HTMLElement): HTMLElement[] {
    const selector = ".markdown-reading-view, .markdown-preview-view, .markdown-source-view";
    const roots = [...container.querySelectorAll<HTMLElement>(selector)];
    if (container.matches(selector)) roots.unshift(container);
    if (roots.length === 0 && container.closest(selector)) roots.push(container.closest<HTMLElement>(selector)!);
    return [...new Set(roots)];
  }

  private enhanceRenderedContent(root: HTMLElement, settings: PolishedMarkdownSettings): void {
    for (const pre of root.querySelectorAll<HTMLPreElement>("pre")) {
      if (isEnhanceableCodeBlock(pre)) this.enhanceCodeBlock(pre, settings);
    }
    for (const table of root.querySelectorAll<HTMLTableElement>("table")) this.enhanceTable(table, settings);
    if (settings.imageLightbox) {
      for (const image of root.querySelectorAll<HTMLImageElement>("img:not(.emoji):not(.callout-icon img)")) this.enhanceImage(image);
    }
    for (const mermaid of root.querySelectorAll<HTMLElement>(".mermaid")) this.enhanceMermaid(mermaid, settings);
    for (const link of root.querySelectorAll<HTMLElement>(".markdown-embed.internal-embed .markdown-embed-link")) {
      this.enhanceEmbeddedNoteLink(link, root);
    }
    this.observeMermaid(root);
  }

  private observeMermaid(root: HTMLElement): void {
    if (this.observers.has(root)) return;
    const observer = new MutationObserver((mutations) => {
      const settings = this.getSettings();
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!node.instanceOf(HTMLElement)) continue;
          if (settings.imageLightbox) {
            if (node.matches("img:not(.emoji):not(.callout-icon img)")) this.enhanceImage(node as HTMLImageElement);
            for (const image of node.querySelectorAll<HTMLImageElement>("img:not(.emoji):not(.callout-icon img)")) this.enhanceImage(image);
          }
          if (node.matches(".mermaid")) this.enhanceMermaid(node, settings);
          for (const mermaid of node.querySelectorAll<HTMLElement>(".mermaid")) this.enhanceMermaid(mermaid, settings);
          if (node.matches(".markdown-embed-link") && node.closest(".markdown-embed.internal-embed")) {
            this.enhanceEmbeddedNoteLink(node, root);
          }
          for (const link of node.querySelectorAll<HTMLElement>(".markdown-embed.internal-embed .markdown-embed-link")) {
            this.enhanceEmbeddedNoteLink(link, root);
          }
        }
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    this.observers.set(root, observer);
  }

  private enhanceCodeBlock(pre: HTMLPreElement, settings: PolishedMarkdownSettings): void {
    if (pre.closest(`.${WRAPPER_CLASS}`)) return;
    const wrapper = createDiv({ cls: WRAPPER_CLASS });
    wrapper.setAttribute(PROCESSED, "true");
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const toolbar = createDiv({ cls: "polished-code-toolbar" });
    wrapper.insertBefore(toolbar, pre);

    if (settings.showCodeLanguage) {
      const language = createSpan({ cls: "polished-code-language" });
      language.textContent = detectCodeLanguage(pre);
      toolbar.appendChild(language);
    }

    const actions = createDiv({ cls: "polished-code-actions" });
    toolbar.appendChild(actions);

    if (settings.showCodeCopyButton) {
      const copy = this.iconButton("copy", "Copy code", "polished-code-copy");
      const onCopy = async (): Promise<void> => {
        try {
          await navigator.clipboard.writeText(pre.querySelector("code")?.textContent ?? pre.textContent ?? "");
          copy.classList.add("is-success");
          copy.setAttribute("aria-label", "Copied");
          copy.querySelector("svg")?.replaceWith(getIcon("check") ?? document.createTextNode(""));
          window.setTimeout(() => {
            copy.classList.remove("is-success");
            copy.setAttribute("aria-label", "Copy code");
            const current = copy.querySelector("svg");
            const icon = getIcon("copy");
            if (current && icon) current.replaceWith(icon);
          }, 1600);
        } catch {
          copy.classList.add("is-error");
          copy.setAttribute("aria-label", "Copy failed");
          window.setTimeout(() => copy.classList.remove("is-error"), 1600);
        }
      };
      const onCopyClick = (): void => { void onCopy(); };
      copy.addEventListener("click", onCopyClick);
      this.cleanupCallbacks.add(() => copy.removeEventListener("click", onCopyClick));
      actions.appendChild(copy);
    }

    const lines = countCodeLines(pre);
    if (settings.showLineNumbers && lines > 0) {
      wrapper.classList.add("has-line-numbers");
      const gutter = createSpan({ cls: "polished-line-numbers" });
      gutter.setAttribute("aria-hidden", "true");
      gutter.textContent = Array.from({ length: lines }, (_, index) => String(index + 1)).join("\n");
      pre.insertBefore(gutter, pre.firstChild);
    }

    if (settings.collapseLongCode && lines > settings.collapseThreshold) {
      wrapper.classList.add("is-collapsible", "is-collapsed");
      const toggle = this.iconButton("chevrons-down", "Expand code", "polished-code-toggle");
      const onToggle = (): void => {
        const collapsed = wrapper.classList.toggle("is-collapsed");
        this.updateToggleButton(toggle, collapsed);
      };
      toggle.addEventListener("click", onToggle);
      this.cleanupCallbacks.add(() => toggle.removeEventListener("click", onToggle));
      actions.appendChild(toggle);
    }
  }

  private enhanceTable(table: HTMLTableElement, settings: PolishedMarkdownSettings): void {
    if (table.parentElement?.classList.contains("polished-table-scroll")) return;
    const wrapper = createDiv({ cls: "polished-table-scroll" });
    wrapper.setAttribute(PROCESSED, "true");
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Scrollable table");
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
    const toolbar = createDiv({ cls: "polished-table-toolbar" });
    const label = createSpan({ cls: "polished-table-label" });
    label.textContent = "Table";
    toolbar.appendChild(label);
    const actions = createDiv({ cls: "polished-table-actions" });
    toolbar.appendChild(actions);
    if (settings.showTableCopyButton) {
      const copy = this.iconButton("copy", "Copy table as Markdown", "polished-table-copy");
      const onCopy = async (): Promise<void> => {
        try {
          await navigator.clipboard.writeText(tableToMarkdown(table));
          copy.classList.add("is-success");
          copy.setAttribute("aria-label", "Table copied");
          copy.querySelector("svg")?.replaceWith(getIcon("check") ?? document.createTextNode(""));
          window.setTimeout(() => {
            copy.classList.remove("is-success");
            copy.setAttribute("aria-label", "Copy table as Markdown");
            const current = copy.querySelector("svg");
            const icon = getIcon("copy");
            if (current && icon) current.replaceWith(icon);
          }, 1600);
        } catch {
          copy.classList.add("is-error");
          copy.setAttribute("aria-label", "Copy failed");
          window.setTimeout(() => copy.classList.remove("is-error"), 1600);
        }
      };
      const onCopyClick = (): void => { void onCopy(); };
      copy.addEventListener("click", onCopyClick);
      this.cleanupCallbacks.add(() => copy.removeEventListener("click", onCopyClick));
      actions.appendChild(copy);
    }
    const expand = this.iconButton("maximize-2", "Expand table", "polished-table-expand");
    actions.appendChild(expand);
    wrapper.insertBefore(toolbar, table);

    let placeholder: Comment | null = null;
    let overlay: HTMLElement | null = null;
    let expandedScale = 1;
    let scaleLabel: HTMLButtonElement | null = null;
    const applyExpandedScale = (next: number): void => {
      expandedScale = clampMermaidScale(Math.round(next * 100) / 100);
      table.style.setProperty("zoom", String(expandedScale));
      if (scaleLabel) scaleLabel.textContent = `${Math.round(expandedScale * 100)}%`;
    };
    const setExpanded = (enabled: boolean): void => {
      if (enabled && !overlay) {
        placeholder = document.createComment("polished-table-expanded");
        wrapper.parentNode?.insertBefore(placeholder, wrapper);
        overlay = this.createContentOverlay("Expanded table", () => setExpanded(false));
        overlay.appendChild(wrapper);
        const zoom = this.createZoomDock(
          () => applyExpandedScale(expandedScale - 0.1),
          () => applyExpandedScale(1),
          () => applyExpandedScale(expandedScale + 0.1)
        );
        scaleLabel = zoom.scaleLabel;
        overlay.appendChild(zoom.element);
        overlay.addEventListener("wheel", (event) => {
          event.preventDefault();
          applyExpandedScale(expandedScale + (event.deltaY < 0 ? 0.1 : -0.1));
        }, { passive: false });
        document.body.appendChild(overlay);
        wrapper.classList.add("is-expanded");
        document.body.classList.add("polished-overlay-open");
      } else if (!enabled && overlay) {
        placeholder?.parentNode?.insertBefore(wrapper, placeholder);
        placeholder?.remove();
        placeholder = null;
        overlay.remove();
        overlay = null;
        scaleLabel = null;
        applyExpandedScale(1);
        wrapper.classList.remove("is-expanded");
        document.body.classList.remove("polished-overlay-open");
      }
      this.updateExpansionButton(expand, enabled, "table");
    };
    const onExpand = (): void => setExpanded(!wrapper.classList.contains("is-expanded"));
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && overlay) setExpanded(false);
    };
    expand.addEventListener("click", onExpand);
    document.addEventListener("keydown", onKey);
    this.cleanupCallbacks.add(() => {
      expand.removeEventListener("click", onExpand);
      document.removeEventListener("keydown", onKey);
      setExpanded(false);
    });
  }

  private enhanceMermaid(mermaid: HTMLElement, settings: PolishedMarkdownSettings): void {
    if (mermaid.closest(`.${MERMAID_BLOCK_CLASS}`)) return;
    const staleCodeWrapper = mermaid.closest<HTMLElement>(`.${WRAPPER_CLASS}`);
    if (staleCodeWrapper?.parentNode) {
      staleCodeWrapper.parentNode.insertBefore(mermaid, staleCodeWrapper);
      staleCodeWrapper.remove();
    }
    if (!settings.showMermaidToolbar || !mermaid.querySelector("svg")) return;

    const block = createDiv({ cls: MERMAID_BLOCK_CLASS });
    block.setAttribute(PROCESSED, "true");
    mermaid.parentNode?.insertBefore(block, mermaid);

    const toolbar = createDiv({ cls: "polished-mermaid-toolbar" });
    const title = createSpan({ cls: "polished-mermaid-label" });
    title.textContent = "Mermaid";
    toolbar.appendChild(title);
    const actions = createDiv({ cls: "polished-mermaid-actions" });
    toolbar.appendChild(actions);

    const viewport = createDiv({ cls: "polished-mermaid-viewport" });
    viewport.tabIndex = 0;
    viewport.setAttribute("role", "region");
    viewport.setAttribute("aria-label", "Zoomable Mermaid diagram");
    const canvas = createDiv({ cls: "polished-mermaid-canvas" });
    viewport.appendChild(canvas);
    canvas.appendChild(mermaid);
    block.append(toolbar, viewport);

    const { width, height } = getMermaidSize(mermaid);
    let scale = 1;
    const scaleLabel = createEl("button", { cls: "polished-mermaid-scale", attr: { type: "button" } });
    scaleLabel.setAttribute("aria-label", "Reset Mermaid zoom");
    const applyScale = (next: number): void => {
      scale = clampMermaidScale(Math.round(next * 100) / 100);
      mermaid.style.transform = `scale(${scale})`;
      canvas.style.width = `${width * scale}px`;
      canvas.style.height = `${height * scale}px`;
      block.style.setProperty("--polished-mermaid-frame-width", `${width * scale + 40}px`);
      block.style.setProperty("--polished-mermaid-frame-height", `${height * scale + 66}px`);
      scaleLabel.textContent = `${Math.round(scale * 100)}%`;
      block.dataset.scale = String(scale);
    };
    const zoomAroundCenter = (next: number): void => {
      const previous = scale;
      const centerX = viewport.scrollLeft + viewport.clientWidth / 2;
      const centerY = viewport.scrollTop + viewport.clientHeight / 2;
      applyScale(next);
      const ratio = scale / previous;
      viewport.scrollLeft = centerX * ratio - viewport.clientWidth / 2;
      viewport.scrollTop = centerY * ratio - viewport.clientHeight / 2;
    };

    const zoomOut = this.iconButton("minus", "Zoom out Mermaid diagram", "polished-mermaid-button");
    const zoomIn = this.iconButton("plus", "Zoom in Mermaid diagram", "polished-mermaid-button");
    const fit = this.iconButton("scan", "Fit Mermaid diagram to width", "polished-mermaid-button");
    const copy = this.iconButton("copy", "Copy Mermaid diagram as SVG", "polished-mermaid-button polished-mermaid-copy");
    const fullscreen = this.iconButton("maximize-2", "Open Mermaid diagram fullscreen", "polished-mermaid-button");
    actions.append(zoomOut, scaleLabel, zoomIn, fit, copy, fullscreen);

    const onZoomOut = (): void => zoomAroundCenter(scale - 0.1);
    const onZoomIn = (): void => zoomAroundCenter(scale + 0.1);
    const onReset = (): void => zoomAroundCenter(1);
    const onFit = (): void => {
      if (viewport.clientWidth <= 24) return;
      const available = viewport.clientWidth - 48;
      zoomAroundCenter(Math.min(1, available / width));
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    };
    const onCopy = async (): Promise<void> => {
      try {
        const svg = mermaid.querySelector("svg")?.outerHTML ?? "";
        await navigator.clipboard.writeText(svg);
        copy.classList.add("is-success");
        copy.setAttribute("aria-label", "Mermaid SVG copied");
        window.setTimeout(() => {
          copy.classList.remove("is-success");
          copy.setAttribute("aria-label", "Copy Mermaid diagram as SVG");
        }, 1600);
      } catch {
        copy.classList.add("is-error");
        copy.setAttribute("aria-label", "Copy failed");
        window.setTimeout(() => copy.classList.remove("is-error"), 1600);
      }
    };
    let fullscreenPlaceholder: Comment | null = null;
    let fullscreenOverlay: HTMLElement | null = null;
    const setFullscreen = (enabled: boolean): void => {
      if (enabled && !fullscreenOverlay) {
        fullscreenPlaceholder = document.createComment("polished-mermaid-fullscreen");
        block.parentNode?.insertBefore(fullscreenPlaceholder, block);
        fullscreenOverlay = this.createContentOverlay("Expanded Mermaid diagram", () => setFullscreen(false));
        fullscreenOverlay.appendChild(block);
        document.body.appendChild(fullscreenOverlay);
      } else if (!enabled && fullscreenOverlay) {
        if (fullscreenPlaceholder) {
          fullscreenPlaceholder.parentNode?.insertBefore(block, fullscreenPlaceholder);
          fullscreenPlaceholder.remove();
        }
        fullscreenPlaceholder = null;
        fullscreenOverlay.remove();
        fullscreenOverlay = null;
      }
      block.classList.toggle("is-fullscreen", enabled);
      document.body.classList.toggle("polished-overlay-open", enabled);
      fullscreen.setAttribute("aria-label", enabled ? "Close Mermaid fullscreen" : "Open Mermaid diagram fullscreen");
      const current = fullscreen.querySelector("svg");
      const icon = getIcon(enabled ? "minimize-2" : "maximize-2");
      if (current && icon) current.replaceWith(icon);
      if (enabled) window.setTimeout(onFit, 0);
    };
    const onFullscreen = (): void => setFullscreen(!block.classList.contains("is-fullscreen"));
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && block.classList.contains("is-fullscreen")) setFullscreen(false);
    };
    const onWheel = (event: WheelEvent): void => {
      if (!block.classList.contains("is-fullscreen") && !event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomAroundCenter(scale + (event.deltaY < 0 ? 0.1 : -0.1));
    };
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startScrollLeft = viewport.scrollLeft;
      startScrollTop = viewport.scrollTop;
      viewport.classList.add("is-dragging");
      viewport.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (!dragging) return;
      viewport.scrollLeft = startScrollLeft - (event.clientX - startX);
      viewport.scrollTop = startScrollTop - (event.clientY - startY);
    };
    const onPointerUp = (event: PointerEvent): void => {
      dragging = false;
      viewport.classList.remove("is-dragging");
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    };

    zoomOut.addEventListener("click", onZoomOut);
    zoomIn.addEventListener("click", onZoomIn);
    scaleLabel.addEventListener("click", onReset);
    fit.addEventListener("click", onFit);
    const onCopyClick = (): void => { void onCopy(); };
    copy.addEventListener("click", onCopyClick);
    fullscreen.addEventListener("click", onFullscreen);
    document.addEventListener("keydown", onKey);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (!block.dataset.userZoomed) onFit();
    });
    resizeObserver?.observe(viewport);
    let initialFitInnerFrame = 0;
    const initialFitFrame = window.requestAnimationFrame(() => {
      initialFitInnerFrame = window.requestAnimationFrame(onFit);
    });
    const markUserZoomed = (): void => { block.dataset.userZoomed = "true"; };
    zoomOut.addEventListener("click", markUserZoomed);
    zoomIn.addEventListener("click", markUserZoomed);
    scaleLabel.addEventListener("click", markUserZoomed);
    viewport.addEventListener("wheel", markUserZoomed, { passive: true });
    this.cleanupCallbacks.add(() => {
      zoomOut.removeEventListener("click", onZoomOut);
      zoomIn.removeEventListener("click", onZoomIn);
      scaleLabel.removeEventListener("click", onReset);
      fit.removeEventListener("click", onFit);
      copy.removeEventListener("click", onCopyClick);
      fullscreen.removeEventListener("click", onFullscreen);
      document.removeEventListener("keydown", onKey);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      zoomOut.removeEventListener("click", markUserZoomed);
      zoomIn.removeEventListener("click", markUserZoomed);
      scaleLabel.removeEventListener("click", markUserZoomed);
      viewport.removeEventListener("wheel", markUserZoomed);
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(initialFitFrame);
      window.cancelAnimationFrame(initialFitInnerFrame);
      setFullscreen(false);
    });
    applyScale(1);
  }

  private enhanceEmbeddedNoteLink(link: HTMLElement, root: HTMLElement): void {
    if (link.dataset.polishedNewTab === "true") return;
    const embed = link.closest<HTMLElement>(".markdown-embed.internal-embed");
    const linktext = embed?.getAttribute("src")
      ?? link.getAttribute("data-href")
      ?? link.getAttribute("href");
    if (!linktext) return;
    link.dataset.polishedNewTab = "true";
    link.setAttribute("aria-label", "Open embedded note in new tab");
    const onClick = (event: MouseEvent): void => {
      event.preventDefault();
      event.stopImmediatePropagation();
      void this.openLinkInNewTab(linktext, root.dataset.polishedSourcePath ?? "");
    };
    link.addEventListener("click", onClick, true);
    this.cleanupCallbacks.add(() => {
      link.removeEventListener("click", onClick, true);
      delete link.dataset.polishedNewTab;
    });
  }

  private enhanceImage(image: HTMLImageElement): void {
    if (image.dataset.polishedLightbox === "true") return;
    image.dataset.polishedLightbox = "true";
    image.tabIndex = image.tabIndex >= 0 ? image.tabIndex : 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", image.alt ? `Open image: ${image.alt}` : "Open image preview");
    const open = (): void => this.openLightbox(image);
    const onClick = (event: MouseEvent): void => {
      event.preventDefault();
      event.stopImmediatePropagation();
      open();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    };
    image.addEventListener("click", onClick, true);
    image.addEventListener("keydown", onKey);
    this.cleanupCallbacks.add(() => {
      image.removeEventListener("click", onClick, true);
      image.removeEventListener("keydown", onKey);
      delete image.dataset.polishedLightbox;
      image.removeAttribute("role");
      image.removeAttribute("aria-label");
    });
  }

  private openLightbox(image: HTMLImageElement): void {
    this.closeLightbox();
    this.lightboxTrigger = image;
    const overlay = createDiv({ cls: "polished-lightbox" });
    overlay.tabIndex = -1;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", image.alt || "Image preview");
    const preview = createEl("img");
    preview.src = image.currentSrc || image.src;
    preview.alt = image.alt;
    overlay.appendChild(preview);
    let scale = 1;
    let scaleLabel: HTMLButtonElement | null = null;
    const applyScale = (next: number): void => {
      scale = clampMermaidScale(Math.round(next * 100) / 100);
      preview.style.transform = `scale(${scale})`;
      if (scaleLabel) scaleLabel.textContent = `${Math.round(scale * 100)}%`;
    };
    const zoom = this.createZoomDock(
      () => applyScale(scale - 0.1),
      () => applyScale(1),
      () => applyScale(scale + 0.1)
    );
    scaleLabel = zoom.scaleLabel;
    overlay.appendChild(zoom.element);
    const close = this.iconButton("x", "Close image preview", "polished-lightbox-close");
    overlay.appendChild(close);
    const onClick = (event: MouseEvent): void => {
      if (event.target === overlay || event.currentTarget === close) this.closeLightbox();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") this.closeLightbox();
    };
    overlay.addEventListener("click", onClick);
    overlay.addEventListener("wheel", (event) => {
      event.preventDefault();
      applyScale(scale + (event.deltaY < 0 ? 0.1 : -0.1));
    }, { passive: false });
    close.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    this.cleanupCallbacks.add(() => {
      overlay.removeEventListener("click", onClick);
      close.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    });
    document.body.appendChild(overlay);
    document.body.classList.add("polished-lightbox-open");
    this.lightbox = overlay;
    close.focus();
  }

  private closeLightbox(): void {
    this.lightbox?.remove();
    this.lightbox = null;
    document.body.classList.remove("polished-lightbox-open");
    this.lightboxTrigger?.focus();
    this.lightboxTrigger = null;
  }

  private iconButton(iconName: string, label: string, className: string): HTMLButtonElement {
    const button = createEl("button", {
      cls: className,
      attr: { type: "button", "aria-label": label, "data-tooltip-position": "top" }
    });
    const icon = getIcon(iconName);
    if (icon) button.appendChild(icon);
    return button;
  }

  private createContentOverlay(label: string, closeOverlay: () => void): HTMLElement {
    const overlay = createDiv({ cls: "polished-content-overlay" });
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", label);
    const close = this.iconButton("x", `Close ${label}`, "polished-overlay-close");
    close.addEventListener("click", closeOverlay, { once: true });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeOverlay();
    });
    overlay.appendChild(close);
    return overlay;
  }

  private createZoomDock(onZoomOut: () => void, onReset: () => void, onZoomIn: () => void): { element: HTMLElement; scaleLabel: HTMLButtonElement } {
    const dock = createDiv({ cls: "polished-overlay-zoom" });
    const zoomOut = this.iconButton("minus", "Zoom out", "polished-overlay-zoom-button");
    const scaleLabel = createEl("button", { cls: "polished-overlay-scale", attr: { type: "button" } });
    scaleLabel.textContent = "100%";
    scaleLabel.setAttribute("aria-label", "Reset zoom");
    const zoomIn = this.iconButton("plus", "Zoom in", "polished-overlay-zoom-button");
    zoomOut.addEventListener("click", onZoomOut);
    scaleLabel.addEventListener("click", onReset);
    zoomIn.addEventListener("click", onZoomIn);
    dock.append(zoomOut, scaleLabel, zoomIn);
    return { element: dock, scaleLabel };
  }

  private updateExpansionButton(button: HTMLButtonElement, expanded: boolean, content: string): void {
    button.setAttribute("aria-label", expanded ? `Collapse ${content}` : `Expand ${content}`);
    const current = button.querySelector("svg");
    const icon = getIcon(expanded ? "minimize-2" : "maximize-2");
    if (current && icon) current.replaceWith(icon);
  }

  private updateToggleButton(button: HTMLButtonElement | null, collapsed: boolean): void {
    if (!button) return;
    button.setAttribute("aria-label", collapsed ? "Expand code" : "Collapse code");
    const current = button.querySelector("svg");
    const icon = getIcon(collapsed ? "chevrons-down" : "chevrons-up");
    if (current && icon) current.replaceWith(icon);
  }
}
