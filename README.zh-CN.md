# Codex Style Markdown

[English](https://github.com/geekyfoxlab/codex-style-markdown/blob/main/README.md) | [简体中文](https://github.com/geekyfoxlab/codex-style-markdown/blob/main/README.zh-CN.md)

Codex Style Markdown 为 Obsidian 的阅读视图和 Live Preview 提供一套统一、精致的视觉系统。它在优化长文排版的同时，为代码、表格、图片、Mermaid 图表和嵌入内容补充实用控件，并完整保留 Obsidian 原生渲染器与语义。

Codex Style Markdown 与 OpenAI、ChatGPT 或 Codex 不存在官方关联，也未获得其赞助或背书。插件的设计与源代码均为原创实现。

![Codex Style Markdown 阅读视图](docs/images/reading-view.png)

## 解决的问题

- 让阅读视图与 Live Preview 不再像两套互不相关的文档样式。
- 宽表格、长代码、大图片和复杂 Mermaid 图表无需离开笔记即可清晰查看。
- 表格复制结果可直接复用为 Markdown，而不是难以整理的单元格文本。
- 在提升视觉效果的同时，不替换或破坏 Wikilink、Callout、嵌入、KaTeX、Mermaid 和 Properties。

## 与同类工具的区别

它不是只处理某一种元素的样式插件。原本需要分别安装排版、代码块、表格、图片查看和 Mermaid 缩放工具的体验，被整合进同一套受作用域保护的视觉系统；单篇笔记开关、多套配色、媒体等比缩放、移动端布局、打印样式和减少动态效果也会协同工作。

## 功能特性

- 统一优化阅读视图与 Live Preview 的排版
- 支持自动、明亮和暗色内容模式
- 提供 Graphite、Forest 和 Spectrum 三套配色
- 响应式表格、图片和嵌入内容
- 代码语言标签、复制、可选行号和长代码折叠
- 表格一键复制为可复用的 Markdown
- Mermaid 等比缩放、适应宽度、拖拽平移、键盘复位和展开查看
- 支持键盘操作的图片灯箱与鼠标滚轮缩放
- 支持全局启用和按笔记选择启用
- 适配明暗主题、移动端、减少动态效果和打印场景
- 设置通过 CSS 变量即时生效
- 设置界面跟随 Obsidian 自动显示中文或英文

## 支持的 Markdown 元素

- 文本：标题、段落、粗体、斜体、删除线、高亮、行内代码、链接、Wikilink、分隔线和脚注
- 列表：有序列表、无序列表、紧凑嵌套层级和任务列表
- 结构化内容：引用、Callout、Properties、笔记嵌入、附件嵌入和响应式表格
- 代码：原生语法高亮、语言标签、复制、可选行号和长代码折叠
- 媒体：响应式图片、点击展开、滚轮缩放和底部缩放控制
- 数学与图表：原生 KaTeX、Mermaid 主题、SVG 复制、适应宽度、拖拽平移、展开查看和不限倍率的等比缩放
- Obsidian 扩展：保留 Callout、Wikilink、嵌入笔记、Properties、Mermaid、数学公式和其他原生 Markdown DOM 的交互能力

嵌入笔记的打开按钮会在新的 Obsidian 标签页中打开目标笔记，不会覆盖当前笔记。

## 效果截图

| 阅读视图 | 暗色模式 |
| --- | --- |
| ![阅读视图](docs/images/reading-view.png) | ![暗色模式](docs/images/dark-mode.png) |

| 代码块 | 展开的 Mermaid 图表 |
| --- | --- |
| ![代码块](docs/images/code-blocks.png) | ![展开的 Mermaid 图表](docs/images/mermaid-expanded.png) |

## 安装

### 从 Release 手动安装

1. 下载 `codex-style-markdown-1.0.4.zip` 并解压。
2. 将 `codex-style-markdown` 文件夹放入 `<仓库目录>/.obsidian/plugins/`。
3. 在 Obsidian 中打开“设置 → 第三方插件”，重新加载插件并启用 Codex Style Markdown。

### 开发安装

```bash
npm install
npm run dev
```

开发时，将本仓库复制或链接至 `<仓库目录>/.obsidian/plugins/codex-style-markdown`。执行 `npm run build` 可生成生产版本。

## 启用方式

默认的全局模式会应用于所有笔记。要对单篇笔记关闭效果，请添加以下 Properties：

```yaml
---
cssclasses:
  - codex-style-markdown-off
---
```

切换为按需启用模式后，请使用 `codex-style-markdown-on`。也可以通过命令面板自动切换当前笔记的状态。

## 命令

- **Codex Style Markdown：切换全局效果**
- **Codex Style Markdown：切换当前笔记效果**
- **Codex Style Markdown：展开或折叠当前笔记的全部代码块**

## Mermaid 控制

Mermaid 图表提供缩小、复位百分比、放大、适应宽度、复制 SVG 和展开按钮。展开后，图表外框与内容会一起等比缩放，不设置最大缩放倍率。可以拖拽平移、使用鼠标滚轮缩放，并按 `Escape` 关闭。

## 外观

外观模式可以跟随 Obsidian，也可以强制使用明亮或暗色样式。配色方案与明暗模式相互独立：

- **Graphite**：以中性色标题和表面为主。
- **Forest**：组合绿色、青色和金色语义色。
- **Spectrum**：使用蓝色、青色、琥珀色和玫红色区分标题层级与图表强调色。

代码复制、表格复制和 Mermaid 控件均可单独启用或关闭。

## 隐私与权限

插件不会通过网络发送笔记内容，也不会收集遥测数据。只有当用户主动复制代码、表格或 Mermaid SVG 时，插件才会访问系统剪贴板。

## 兼容性

最低支持 Obsidian 1.6.0。桌面端是主要目标；移动端支持核心排版、响应式表格、代码工具、图表和图片预览。其他插件生成的内容只要使用标准 Markdown DOM，也会继承本插件的视觉系统。

插件不会替换 Obsidian 的 Markdown 解析器，并使用限定作用域的样式。选择器优先级很高的主题仍可能覆盖个别细节。

## 验证

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run package
```

可使用 `examples/markdown-showcase.md` 在阅读视图和 Live Preview 中进行完整视觉测试。

## 许可证

MIT
