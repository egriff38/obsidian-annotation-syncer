import { Option } from "effect";
import type { LinkHandler } from "../../obsidian/link-interceptor.js";
import type { WebViewElement } from "./web-view-bridge.js";
import { parseYouTubeUrl } from "./url-parser.js";

export function makeYouTubeLinkHandler(
  findWebView: () => WebViewElement | null,
): LinkHandler {
  return (href) => {
    const parsed = parseYouTubeUrl(href);
    if (Option.isNone(parsed)) return false;
    const { timestamp } = parsed.value;
    if (Option.isNone(timestamp)) return false;
    const webviewEl = findWebView();
    if (!webviewEl) return false;
    webviewEl
      .executeJavaScript(
        `document.querySelector('video').currentTime = ${timestamp.value}`,
      )
      .catch((err) =>
        console.error("[annotation-syncer] seekTo failed:", err),
      );
    return true;
  };
}
