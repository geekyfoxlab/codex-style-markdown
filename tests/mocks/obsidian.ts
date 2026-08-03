export function getIcon(name: string): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("data-icon", name);
  return svg;
}

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, options?: DomElementInfo | string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (typeof options === "string") {
    element.className = options;
  } else if (options) {
    if (options.cls) {
      const classes = (Array.isArray(options.cls) ? options.cls : [options.cls]).flatMap((name) => name.split(/\s+/)).filter(Boolean);
      element.classList.add(...classes);
    }
    if (typeof options.text === "string") element.textContent = options.text;
    else if (options.text) element.appendChild(options.text);
    for (const [name, value] of Object.entries(options.attr ?? {})) {
      if (value !== null) element.setAttribute(name, String(value));
    }
  }
  return element;
}

globalThis.createEl = createElement;
globalThis.createDiv = (options?: DomElementInfo | string): HTMLDivElement => createElement("div", options);
globalThis.createSpan = (options?: DomElementInfo | string): HTMLSpanElement => createElement("span", options);

Object.defineProperty(Node.prototype, "instanceOf", {
  configurable: true,
  value<T>(this: Node, type: { new (): T }): this is Node & T {
    return this instanceof type;
  }
});
