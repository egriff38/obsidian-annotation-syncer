import { Effect, Option } from "effect";
import type { BridgeInstanceTop } from "../core/bridge-module.js";
import { YouTubeAdapter } from "../adapters/youtube/youtube-adapter.js";
import { MarkdownAdapter } from "../adapters/markdown/markdown-adapter.js";
import { makeSyncBroker } from "../core/sync-broker.js";
import { ytMdStrategy } from "./yt-markdown.js";
import { createChordDetector } from "../obsidian/chord-detector.js";
import {
  makeCreateBookmarklet,
  makeBookmarkletEnd,
  makeScanNext,
  makeScanPrev,
} from "../obsidian/commands.js";

export const ytMdBridge = Effect.gen(function* () {
  const yt = yield* YouTubeAdapter;
  const md = yield* MarkdownAdapter;
  const broker = yield* makeSyncBroker({
    source: yt,
    annotation: md,
    strategy: ytMdStrategy,
  });
  const chordDetector = yield* createChordDetector();

  return {
    id: "yt-markdown",
    commands: [
      {
        id: "create-bookmarklet",
        name: "Create Bookmark",
        execute: makeCreateBookmarklet({ yt, md, chordDetector }),
      },
      {
        id: "bookmarklet-end",
        name: "Bookmarklet End",
        execute: makeBookmarkletEnd({ yt, md, chordDetector }),
      },
      {
        id: "scan-next",
        name: "Next Bookmark",
        execute: makeScanNext({ broker }),
      },
      {
        id: "scan-prev",
        name: "Previous Bookmark",
        execute: makeScanPrev({ broker }),
      },
    ],
  } as const satisfies BridgeInstanceTop;
});
