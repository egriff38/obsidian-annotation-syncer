import { Effect, ManagedRuntime } from "effect";
import type { Plugin } from "obsidian";
import type { BridgeInstanceTop } from "../core/bridge-module.js";
import { makeAppLayer } from "./composition.js";

export function createPluginShell(
  loadedBridges: ReadonlyArray<BridgeInstanceTop>,
) {
  let runtime: ManagedRuntime.ManagedRuntime<any, never> | null = null;

  return {
    onload(app: Plugin["app"]) {
      const appLayer = makeAppLayer(app);
      runtime = ManagedRuntime.make(appLayer);

      return loadedBridges.flatMap((b) =>
        b.commands.map((cmd) => ({
          id: `annotation-syncer:${b.id}:${cmd.id}` as const,
          cmdId: cmd.id,
          bridgeId: b.id,
          name: cmd.name,
          callback: () =>
            Effect.runPromiseExit(
              cmd.execute.pipe(Effect.tapError(Effect.logError)),
            ),
        })),
      );
    },

    onunload() {
      if (runtime) {
        void runtime.dispose();
        runtime = null;
      }
    },
  };
}
