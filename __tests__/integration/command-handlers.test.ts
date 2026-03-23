import { describe, expect, it, vi } from "vitest";
import { Effect, Option, Stream } from "effect";
import { YouTubeTimestamp, ChapterData } from "../../src/adapters/youtube/model.js";
import { MarkdownPosition } from "../../src/adapters/markdown/model.js";
import { AdapterError } from "../../src/core/model.js";
import {
  makeCreateBookmarklet,
  makeScanNext,
} from "../../src/obsidian/commands.js";
import { createChordDetector } from "../../src/obsidian/chord-detector.js";
import type { LeafAdapter } from "../../src/core/leaf-adapter.js";
import type { SyncStrategy } from "../../src/core/sync-strategy.js";
import { makeSyncBroker } from "../../src/core/sync-broker.js";

describe("makeCreateBookmarklet", () => {
  it("inserts a timestamp link at cursor", async () => {
    const insertFn = vi.fn(() =>
      Effect.succeed({
        from: new MarkdownPosition({ line: 5, ch: 0 }),
        to: new MarkdownPosition({ line: 5, ch: 30 }),
      }),
    );

    const program = Effect.gen(function* () {
      const chordDetector = yield* createChordDetector();
      yield* makeCreateBookmarklet({
        yt: {
          getLocation: Effect.succeed(
            Option.some(new YouTubeTimestamp({ seconds: 90 })),
          ) as Effect.Effect<Option.Option<YouTubeTimestamp>, AdapterError>,
          getChapters: Effect.succeed([
            new ChapterData({ title: "Intro", startSeconds: 0 }),
          ]) as Effect.Effect<ReadonlyArray<ChapterData>, AdapterError>,
          getVideoId: Effect.succeed(
            Option.some("abc123"),
          ) as Effect.Effect<Option.Option<string>, AdapterError>,
        },
        md: {
          getLocation: Effect.succeed(
            Option.some(new MarkdownPosition({ line: 5, ch: 0 })),
          ) as Effect.Effect<Option.Option<MarkdownPosition>, AdapterError>,
          insertTimestampLink: insertFn,
        },
        chordDetector,
      });
      expect(insertFn).toHaveBeenCalledOnce();
    });
    await Effect.runPromise(program);
  });

  it("does nothing when no YouTube location", async () => {
    const insertFn = vi.fn(() =>
      Effect.succeed({
        from: new MarkdownPosition({ line: 0, ch: 0 }),
        to: new MarkdownPosition({ line: 0, ch: 0 }),
      }),
    );

    const program = Effect.gen(function* () {
      const chordDetector = yield* createChordDetector();
      yield* makeCreateBookmarklet({
        yt: {
          getLocation: Effect.succeed(
            Option.none(),
          ) as Effect.Effect<Option.Option<YouTubeTimestamp>, AdapterError>,
          getChapters: Effect.succeed(
            [],
          ) as Effect.Effect<ReadonlyArray<ChapterData>, AdapterError>,
          getVideoId: Effect.succeed(
            Option.none(),
          ) as Effect.Effect<Option.Option<string>, AdapterError>,
        },
        md: {
          getLocation: Effect.succeed(
            Option.none(),
          ) as Effect.Effect<Option.Option<MarkdownPosition>, AdapterError>,
          insertTimestampLink: insertFn,
        },
        chordDetector,
      });
      expect(insertFn).not.toHaveBeenCalled();
    });
    await Effect.runPromise(program);
  });
});

interface TestLoc {
  readonly _tag: "TestLoc";
  readonly value: number;
}

const testLoc = (value: number): TestLoc => ({ _tag: "TestLoc", value });

describe("makeScanNext", () => {
  it("reads the current track from the broker", async () => {
    const adapter: LeafAdapter<TestLoc, TestLoc> = {
      getLocation: Effect.succeed(Option.some(testLoc(1))),
      seekTo: () => Effect.void,
      getContent: Effect.succeed(""),
      getMetadata: Effect.succeed({}),
      locationChanges: Stream.fromIterable([testLoc(1)]),
      dispose: Effect.void,
    };

    const strategy: SyncStrategy<TestLoc, TestLoc, TestLoc, TestLoc> = {
      deriveRegion: () => Option.none(),
      buildTrack: (s, a) => [...s, ...a],
      translateLocation: () => Option.none(),
    };

    const program = Effect.scoped(
      Effect.gen(function* () {
        const broker = yield* makeSyncBroker({
          source: adapter,
          annotation: adapter,
          strategy,
        });
        yield* makeScanNext({ broker });
      }),
    );
    await Effect.runPromise(program);
  });
});
