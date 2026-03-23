import type { App, Hotkey } from "obsidian";

interface BeforeInputEvent {
  readonly key: string;
  readonly code: string;
  readonly shift: boolean;
  readonly control: boolean;
  readonly alt: boolean;
  readonly meta: boolean;
  readonly isAutoRepeat: boolean;
  readonly isComposing: boolean;
}

export interface WebViewElementWithInput {
  addEventListener(
    event: "before-input-event",
    handler: (event: unknown, input: BeforeInputEvent) => void,
  ): void;
  addEventListener(event: string, handler: (...args: unknown[]) => void): void;
  removeEventListener(event: string, handler: (...args: unknown[]) => void): void;
}

function matchesHotkey(
  input: BeforeInputEvent,
  hotkey: Hotkey,
  isMac: boolean,
): boolean {
  for (const mod of hotkey.modifiers) {
    switch (mod) {
      case "Mod":
        if (isMac ? !input.meta : !input.control) return false;
        break;
      case "Ctrl":
        if (!input.control) return false;
        break;
      case "Meta":
        if (!input.meta) return false;
        break;
      case "Shift":
        if (!input.shift) return false;
        break;
      case "Alt":
        if (!input.alt) return false;
        break;
    }
  }
  return input.key.toUpperCase() === hotkey.key.toUpperCase();
}

/**
 * Register a before-input-event listener on a webview element so that
 * Obsidian hotkeys fire even when the webview has focus.
 *
 * Accepts a lookup function to resolve the current webview element on
 * each event, tolerating DOM detach/reattach cycles.
 *
 * Returns a cleanup function to remove the listener.
 */
export function registerWebViewKeyIntercept(
  findWebView: () => WebViewElementWithInput | null,
  app: App,
  commandHotkeys: ReadonlyArray<{ commandId: string; hotkeys: Hotkey[] }>,
): () => void {
  const isMac = navigator.platform.includes("Mac");

  const handler = (_event: unknown, input: BeforeInputEvent) => {
    for (const entry of commandHotkeys) {
      for (const hotkey of entry.hotkeys) {
        if (matchesHotkey(input, hotkey, isMac)) {
          (app as any).commands.executeCommandById(entry.commandId);
          return;
        }
      }
    }
  };

  let currentEl = findWebView();
  if (currentEl) {
    currentEl.addEventListener("before-input-event", handler);
  }

  const interval = setInterval(() => {
    const el = findWebView();
    if (el !== currentEl) {
      if (currentEl) {
        currentEl.removeEventListener("before-input-event", handler as any);
      }
      currentEl = el;
      if (currentEl) {
        currentEl.addEventListener("before-input-event", handler);
      }
    }
  }, 2000);

  return () => {
    clearInterval(interval);
    if (currentEl) {
      currentEl.removeEventListener("before-input-event", handler as any);
    }
  };
}
