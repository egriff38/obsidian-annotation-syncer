import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { Plugin } from "obsidian";

/**
 * Callback that attempts to handle a clicked link.
 * Returns `true` if the link was handled (prevents default navigation),
 * `false` to let Obsidian handle it normally.
 */
export type LinkHandler = (href: string) => boolean;

const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

function extractLinkUrlAtPos(
  doc: string,
  pos: number,
): string | undefined {
  const lineStart = doc.lastIndexOf("\n", pos - 1) + 1;
  const lineEnd = doc.indexOf("\n", pos);
  const line = doc.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  const offsetInLine = pos - lineStart;

  MD_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MD_LINK_RE.exec(line)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;
    if (offsetInLine >= matchStart && offsetInLine < matchEnd) {
      return match[2];
    }
  }
  return undefined;
}

/**
 * Reading mode: intercept clicks on external links via post processor.
 */
export function registerLinkInterceptor(
  plugin: Plugin,
  handler: LinkHandler,
): void {
  plugin.registerMarkdownPostProcessor((el) => {
    const anchors = el.querySelectorAll<HTMLAnchorElement>("a.external-link");
    for (const anchor of Array.from(anchors)) {
      const href = anchor.getAttribute("href");
      if (!href) continue;

      anchor.addEventListener("click", (evt: MouseEvent) => {
        if (handler(href)) {
          evt.preventDefault();
          evt.stopPropagation();
        }
      });
    }
  });
}

/**
 * Live preview / source mode: intercept clicks on link tokens.
 * Only intercepts collapsed (rendered) links, not expanded markdown syntax.
 */
export function linkInterceptExtension(
  handler: LinkHandler,
): Extension {
  return EditorView.domEventHandlers({
    click(event, view) {
      const target = event.target as HTMLElement | null;
      if (!target) return false;

      const isCollapsedLink =
        target.classList.contains("cm-underline") ||
        target.closest(".cm-underline") !== null;

      const anchor = target.closest("a") as HTMLAnchorElement | null;
      let href = anchor?.getAttribute("href") ?? undefined;

      if (!href && isCollapsedLink) {
        const pos = view.posAtDOM(target);
        const doc = view.state.doc.toString();
        href = extractLinkUrlAtPos(doc, pos);
      }

      if (!href) return false;

      const fullHref = href.startsWith("http") ? href : undefined;
      if (!fullHref) return false;

      if (handler(fullHref)) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }

      return false;
    },
  });
}
