import { beforeEach, describe, expect, it } from "vitest";

import { clampMermaidScale, countCodeLines, detectCodeLanguage, getMermaidSize, isEnhanceableCodeBlock, MarkdownEnhancer, tableToMarkdown } from "../src/enhancer";
import { DEFAULT_SETTINGS } from "../src/settings";

describe("MarkdownEnhancer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("detects fenced code languages and line counts", () => {
    const pre = document.createElement("pre");
    pre.innerHTML = '<code class="language-typescript">const a = 1;\nconst b = 2;\n</code>';
    expect(detectCodeLanguage(pre)).toBe("typescript");
    expect(countCodeLines(pre)).toBe(2);
  });

  it("falls back to text for code without a language", () => {
    const pre = document.createElement("pre");
    pre.innerHTML = "<code>plain</code>";
    expect(detectCodeLanguage(pre)).toBe("text");
  });

  it("ignores Obsidian frontmatter and Mermaid guard source", () => {
    document.body.innerHTML = '<div class="mod-frontmatter"><pre id="frontmatter"><code>title: Test</code></pre></div><div class="mermaid-guard-source"><pre id="mermaid"><code>flowchart LR</code></pre></div><div><pre id="code"><code>visible</code></pre></div>';
    expect(isEnhanceableCodeBlock(document.querySelector<HTMLPreElement>("#frontmatter")!)).toBe(false);
    expect(isEnhanceableCodeBlock(document.querySelector<HTMLPreElement>("#mermaid")!)).toBe(false);
    expect(isEnhanceableCodeBlock(document.querySelector<HTMLPreElement>("#code")!)).toBe(true);
  });

  it("serializes tables as reusable Markdown", () => {
    document.body.innerHTML = "<table><thead><tr><th>Name</th><th>Notes</th></tr></thead><tbody><tr><td>Alpha</td><td>A | B</td></tr><tr><td>Beta</td><td>Two<br>lines</td></tr></tbody></table>";
    const table = document.querySelector<HTMLTableElement>("table")!;
    expect(tableToMarkdown(table)).toBe("| Name | Notes |\n| --- | --- |\n| Alpha | A \\| B |\n| Beta | Two<br>lines |");
  });

  it("clamps Mermaid zoom and reads SVG viewBox dimensions", () => {
    document.body.innerHTML = '<div class="mermaid"><svg viewBox="0 0 800 320"></svg></div>';
    const mermaid = document.querySelector<HTMLElement>(".mermaid")!;
    expect(clampMermaidScale(0.1)).toBe(0.5);
    expect(clampMermaidScale(4)).toBe(4);
    expect(getMermaidSize(mermaid)).toEqual({ width: 800, height: 320 });
  });

  it("adds Mermaid controls once and restores the diagram on destroy", () => {
    document.body.innerHTML = '<div class="markdown-reading-view"><div class="markdown-preview-view"><div class="mermaid"><svg viewBox="0 0 600 200"></svg></div></div></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    const enhancer = new MarkdownEnhancer(() => ({ ...DEFAULT_SETTINGS }));
    enhancer.enhance(root);
    enhancer.enhance(root);
    expect(root.querySelectorAll(".polished-mermaid-block")).toHaveLength(1);
    expect(root.querySelectorAll(".polished-mermaid-button")).toHaveLength(5);
    expect(root.querySelector(".polished-mermaid-copy")).not.toBeNull();
    expect(root.querySelector(".polished-mermaid-scale")?.textContent).toBe("100%");
    root.querySelector<HTMLButtonElement>('[aria-label="Zoom in Mermaid diagram"]')?.click();
    expect(root.querySelector(".polished-mermaid-scale")?.textContent).toBe("110%");
    root.querySelector<HTMLButtonElement>('[aria-label="Open Mermaid diagram fullscreen"]')?.click();
    expect(document.querySelector(".polished-mermaid-block")?.classList.contains("is-fullscreen")).toBe(true);
    const expanded = document.querySelector<HTMLElement>(".polished-mermaid-block")!;
    expect(expanded.style.getPropertyValue("--polished-mermaid-frame-width")).toBe("700px");
    expect(expanded.style.getPropertyValue("--polished-mermaid-frame-height")).toBe("286px");
    document.querySelector<HTMLElement>(".polished-mermaid-viewport")?.dispatchEvent(new WheelEvent("wheel", { deltaY: -1, bubbles: true, cancelable: true }));
    expect(document.querySelector(".polished-mermaid-scale")?.textContent).toBe("120%");
    expect(expanded.style.getPropertyValue("--polished-mermaid-frame-width")).toBe("760px");
    expect(expanded.style.getPropertyValue("--polished-mermaid-frame-height")).toBe("306px");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(root.querySelector(".polished-mermaid-block")?.classList.contains("is-fullscreen")).toBe(false);
    enhancer.destroy();
    expect(root.querySelector(".polished-mermaid-block")).toBeNull();
    expect(root.querySelector(".mermaid svg")).not.toBeNull();
  });

  it("unwraps Mermaid output left inside an asynchronous code wrapper", () => {
    document.body.innerHTML = '<div class="markdown-reading-view"><div class="markdown-preview-view"><div class="polished-code-block"><div class="mermaid"><svg viewBox="0 0 500 180"></svg></div></div></div></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    new MarkdownEnhancer(() => ({ ...DEFAULT_SETTINGS })).enhance(root);
    expect(root.querySelector(".polished-code-block")).toBeNull();
    expect(root.querySelector(".polished-mermaid-block .mermaid svg")).not.toBeNull();
  });

  it("honors independent code, table, and Mermaid toolbar switches", () => {
    document.body.innerHTML = '<div class="markdown-reading-view"><div class="markdown-preview-view"><pre><code>one</code></pre><table><tr><th>A</th></tr></table><div class="mermaid"><svg viewBox="0 0 500 180"></svg></div></div></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    new MarkdownEnhancer(() => ({ ...DEFAULT_SETTINGS, showCodeCopyButton: false, showTableCopyButton: false, showMermaidToolbar: false })).enhance(root);
    expect(root.querySelector(".polished-code-copy")).toBeNull();
    expect(root.querySelector(".polished-table-copy")).toBeNull();
    expect(root.querySelector(".polished-mermaid-block")).toBeNull();
    expect(root.querySelector(".mermaid svg")).not.toBeNull();
  });

  it("enhances code and tables exactly once", () => {
    document.body.innerHTML = '<div class="markdown-reading-view"><div class="markdown-preview-view"><pre><code class="language-js">one\ntwo</code></pre><table><tbody><tr><td>A</td></tr></tbody></table></div></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    const enhancer = new MarkdownEnhancer(() => ({ ...DEFAULT_SETTINGS, collapseThreshold: 1 }));
    enhancer.enhance(root);
    enhancer.enhance(root);
    expect(root.querySelectorAll(".polished-code-block")).toHaveLength(1);
    expect(root.querySelectorAll(".polished-table-scroll")).toHaveLength(1);
    expect(root.querySelectorAll(".polished-table-copy")).toHaveLength(1);
    expect(root.querySelectorAll(".polished-table-expand")).toHaveLength(1);
    expect(root.querySelector(".polished-code-block")?.classList.contains("is-collapsed")).toBe(true);
  });

  it("expands tables into a dismissible centered overlay", () => {
    document.body.innerHTML = '<div class="markdown-reading-view"><div class="markdown-preview-view"><table><tr><th>A</th></tr><tr><td>B</td></tr></table></div></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    const enhancer = new MarkdownEnhancer(() => ({ ...DEFAULT_SETTINGS }));
    enhancer.enhance(root);
    root.querySelector<HTMLButtonElement>(".polished-table-expand")?.click();
    expect(document.querySelector(".polished-content-overlay .polished-table-scroll.is-expanded")).not.toBeNull();
    document.querySelector<HTMLButtonElement>('.polished-overlay-zoom-button[aria-label="Zoom in"]')?.click();
    expect(document.querySelector(".polished-overlay-scale")?.textContent).toBe("110%");
    document.querySelector<HTMLElement>(".polished-content-overlay")?.click();
    expect(document.querySelector(".polished-content-overlay")).toBeNull();
    expect(root.querySelector(".polished-table-scroll")).not.toBeNull();
    enhancer.destroy();
  });

  it("opens images in a dismissible lightbox and restores focus", () => {
    document.body.innerHTML = '<div class="markdown-reading-view"><div class="markdown-preview-view"><img src="example.png" alt="Example"></div></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    const image = root.querySelector<HTMLImageElement>("img")!;
    const enhancer = new MarkdownEnhancer(() => ({ ...DEFAULT_SETTINGS }));
    enhancer.enhance(root);
    image.click();
    image.click();
    expect(document.querySelectorAll(".polished-lightbox")).toHaveLength(1);
    expect(document.querySelector(".polished-lightbox img")?.getAttribute("alt")).toBe("Example");
    document.querySelector<HTMLButtonElement>('.polished-overlay-zoom-button[aria-label="Zoom in"]')?.click();
    expect(document.querySelector<HTMLImageElement>(".polished-lightbox img")?.style.transform).toBe("scale(1.1)");
    document.querySelector<HTMLElement>(".polished-lightbox")?.click();
    expect(document.querySelector(".polished-lightbox")).toBeNull();
    expect(document.activeElement).toBe(image);
    enhancer.destroy();
  });

  it("enhances images inserted asynchronously after the initial render", async () => {
    document.body.innerHTML = '<div class="markdown-reading-view"><div class="markdown-preview-view"><div id="media"></div></div></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    const enhancer = new MarkdownEnhancer(() => ({ ...DEFAULT_SETTINGS }));
    enhancer.enhance(root);
    const image = document.createElement("img");
    image.src = "later.png";
    image.alt = "Later";
    root.querySelector("#media")?.appendChild(image);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(image.dataset.polishedLightbox).toBe("true");
    image.click();
    expect(document.querySelectorAll(".polished-lightbox")).toHaveLength(1);
    enhancer.destroy();
  });

  it("enhances tables inserted asynchronously after the initial render", async () => {
    document.body.innerHTML = '<div class="markdown-reading-view"><div class="markdown-preview-view"><div id="later"></div></div></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    const enhancer = new MarkdownEnhancer(() => ({ ...DEFAULT_SETTINGS }));
    enhancer.enhance(root);
    root.querySelector("#later")!.innerHTML = "<table><tr><th>Wide heading</th></tr><tr><td>Value</td></tr></table>";
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(root.querySelectorAll(".polished-table-scroll")).toHaveLength(1);
    expect(root.querySelector(".polished-table-viewport > table")).not.toBeNull();
    enhancer.destroy();
  });

  it("opens embedded notes in a new tab with the source path", () => {
    document.body.innerHTML = '<div class="markdown-reading-view"><div class="markdown-embed internal-embed" src="Another note"><a class="markdown-embed-link" href="Another note"></a></div></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    const opened: Array<{ linktext: string; sourcePath: string }> = [];
    const enhancer = new MarkdownEnhancer(
      () => ({ ...DEFAULT_SETTINGS }),
      (linktext, sourcePath) => {
        opened.push({ linktext, sourcePath });
        return Promise.resolve();
      }
    );
    enhancer.enhance(root, "Folder/Source.md");
    root.querySelector<HTMLElement>(".markdown-embed-link")?.click();
    expect(opened).toEqual([{ linktext: "Another note", sourcePath: "Folder/Source.md" }]);
    expect(root.querySelector(".markdown-embed-link")?.getAttribute("aria-label")).toBe("Open internal link in new tab");
    enhancer.destroy();
  });

  it("opens regular internal links in a new tab when enabled", () => {
    document.body.innerHTML = '<div class="markdown-reading-view"><a class="internal-link" data-href="Target#Section" href="Target#Section">Target</a></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    const opened: string[] = [];
    const enhancer = new MarkdownEnhancer(
      () => ({ ...DEFAULT_SETTINGS }),
      (linktext) => { opened.push(linktext); return Promise.resolve(); }
    );
    enhancer.enhance(root, "Source.md");
    root.querySelector<HTMLElement>("a.internal-link")?.click();
    expect(opened).toEqual(["Target#Section"]);
    enhancer.destroy();
  });

  it("does not enhance an opted-out note", () => {
    document.body.innerHTML = '<div class="markdown-reading-view codex-style-markdown-off"><div class="markdown-preview-view"><pre><code>one</code></pre></div></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    new MarkdownEnhancer(() => ({ ...DEFAULT_SETTINGS })).enhance(root);
    expect(root.querySelector(".polished-code-block")).toBeNull();
  });

  it("removes plugin state on destroy", () => {
    document.body.innerHTML = '<div class="markdown-reading-view"><div class="markdown-preview-view"><pre><code>one</code></pre></div></div>';
    const root = document.querySelector<HTMLElement>(".markdown-reading-view")!;
    const enhancer = new MarkdownEnhancer(() => ({ ...DEFAULT_SETTINGS }));
    enhancer.enhance(root);
    enhancer.destroy();
    expect(document.querySelector(".codex-style-markdown-active")).toBeNull();
    expect(document.querySelector(".polished-code-block")).toBeNull();
    expect(document.querySelector("pre code")?.textContent).toBe("one");
  });
});
