import { Plugin } from "obsidian";
import type { Hotkey } from "obsidian";
import { Effect, ManagedRuntime } from "effect";
import { makeAppLayer, makeResolveWebView } from "./obsidian/composition.js";
import type { WebViewElement } from "./adapters/youtube/web-view-bridge.js";
import type { CommandHandler } from "./core/bridge-module.js";
import { ytMdBridge } from "./strategies/yt-markdown-bridge.js";
import { makeYouTubeLinkHandler } from "./adapters/youtube/youtube-link-handler.js";
import {
  registerLinkInterceptor,
  linkInterceptExtension,
} from "./obsidian/link-interceptor.js";
import { registerWebViewKeyIntercept } from "./obsidian/webview-key-intercept.js";
import type { WebViewElementWithInput } from "./obsidian/webview-key-intercept.js";

const DEFAULT_HOTKEYS: Record<string, Hotkey[]> = {
  "bookmarklet-end": [{ modifiers: ["Mod", "Shift"], key: "D" }],
  "scan-next": [{ modifiers: ["Mod", "Shift"], key: "]" }],
  "scan-prev": [{ modifiers: ["Mod", "Shift"], key: "[" }],
};

function findWebViewElement(app: Plugin["app"]): WebViewElement | null {
  const leaves = app.workspace.getLeavesOfType("webviewer");
  if (leaves.length === 0) return null;
  const leaf = leaves[0]!;
  const webview = (leaf.view as any).containerEl?.querySelector("webview");
  return webview ?? null;
}

export default class AnnotationSyncerPlugin extends Plugin {
  private runtime: ManagedRuntime.ManagedRuntime<any, never> | null = null;
  private cleanupKeyIntercept: (() => void) | null = null;

  async onload() {
    this.app.workspace.onLayoutReady(() => {
      this.initializeBridges();
    });
    if (this.app.workspace.layoutReady) {
      this.initializeBridges();
    }
  }

  private async initializeBridges() {
    const appLayer = makeAppLayer(this.app);
    this.runtime = ManagedRuntime.make(appLayer);

    try {
      const bridge = await this.runtime.runPromise(
        ytMdBridge.pipe(Effect.scoped),
      );

      bridge.commands.forEach(<E>(cmd: CommandHandler<string, E>) => {
        const hotkeys = DEFAULT_HOTKEYS[cmd.id];
        this.addCommand({
          id: `${bridge.id}:${cmd.id}`,
          name: cmd.name,
          ...(hotkeys && { hotkeys }),
          callback: () => {
            Effect.runPromiseExit(
              cmd.execute.pipe(Effect.tapError(Effect.logError)),
            );
          },
        });
      });

      console.log(
        `[annotation-syncer] Registered ${bridge.commands.length} commands from bridge "${bridge.id}"`,
      );

      const lookupWebView = () => findWebViewElement(this.app);

      registerLinkInterceptor(this, makeYouTubeLinkHandler(lookupWebView));
      this.registerEditorExtension(
        linkInterceptExtension(makeYouTubeLinkHandler(lookupWebView)),
      );

      const commandHotkeys = Object.entries(DEFAULT_HOTKEYS).map(
        ([cmdId, hotkeys]) => ({
          commandId: `annotation-syncer:${bridge.id}:${cmdId}`,
          hotkeys,
        }),
      );
      this.cleanupKeyIntercept = registerWebViewKeyIntercept(
        lookupWebView as () => WebViewElementWithInput | null,
        this.app,
        commandHotkeys,
      );
    } catch (err) {
      console.error("[annotation-syncer] Bridge initialization failed:", err);
    }
  }

  onunload() {
    this.cleanupKeyIntercept?.();
    this.cleanupKeyIntercept = null;
    if (this.runtime) {
      void this.runtime.dispose();
      this.runtime = null;
    }
  }
}
