import { Effect, Layer, Match } from "effect";
import type { Plugin } from "obsidian";
import type {
  YouTubeTimestamp,
  TimeRange,
} from "../adapters/youtube/model.js";
import { WebViewBridgeError } from "../adapters/youtube/model.js";
import type {
  MarkdownPosition,
  LineRange,
} from "../adapters/markdown/model.js";
import { EditorNotFoundError } from "../adapters/markdown/model.js";
import { YouTubeAdapter } from "../adapters/youtube/youtube-adapter.js";
import { MarkdownAdapter } from "../adapters/markdown/markdown-adapter.js";
import { WebViewBridge } from "../adapters/youtube/web-view-bridge.js";
import type { WebViewElement } from "../adapters/youtube/web-view-bridge.js";
import type { ObsidianEditor } from "../adapters/markdown/obsidian-editor.js";

export type AppLocation = YouTubeTimestamp | MarkdownPosition;
export type AppRegion = TimeRange | LineRange;

export const describeLocation = Match.type<AppLocation>().pipe(
  Match.tag("YouTubeTimestamp", ({ seconds }) => `YouTube @ ${seconds}s`),
  Match.tag("MarkdownPosition", ({ line, ch }) => `Markdown L${line}:${ch}`),
  Match.exhaustive,
);

function findWebViewElement(app: Plugin["app"]): WebViewElement | null {
  const leaves = app.workspace.getLeavesOfType("webviewer");
  if (leaves.length === 0) return null;
  const leaf = leaves[0]!;
  const webview = (leaf.view as any).containerEl?.querySelector("webview");
  return webview ?? null;
}

function findMarkdownEditor(app: Plugin["app"]): ObsidianEditor | null {
  for (const leaf of app.workspace.getLeavesOfType("markdown")) {
    const editor = (leaf.view as any)?.editor;
    if (editor) return editor;
  }
  return null;
}

export function makeResolveWebView(
  app: Plugin["app"],
): Effect.Effect<WebViewElement, WebViewBridgeError> {
  return Effect.sync(() => findWebViewElement(app)).pipe(
    Effect.flatMap((el) =>
      el
        ? Effect.succeed(el)
        : Effect.fail(
            new WebViewBridgeError({ message: "webview not attached to DOM" }),
          ),
    ),
  );
}

export function makeResolveEditor(
  app: Plugin["app"],
): Effect.Effect<ObsidianEditor, EditorNotFoundError> {
  return Effect.sync(() => findMarkdownEditor(app)).pipe(
    Effect.flatMap((el) =>
      el
        ? Effect.succeed(el)
        : Effect.fail(
            new EditorNotFoundError({ message: "no markdown editor found" }),
          ),
    ),
  );
}

export function makeAppLayer(
  app: Plugin["app"],
): Layer.Layer<YouTubeAdapter | MarkdownAdapter> {
  const resolveWebView = makeResolveWebView(app);
  const resolveEditor = makeResolveEditor(app);
  return Layer.mergeAll(
    YouTubeAdapter.layer.pipe(
      Layer.provide(WebViewBridge.layer(resolveWebView)),
    ),
    MarkdownAdapter.layer(resolveEditor),
  );
}
