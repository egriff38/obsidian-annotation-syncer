import { describe, expect, it, vi } from "vitest";
import { Effect, Layer, Option, Stream } from "effect";
import { YouTubeTimestamp, ChapterData } from "../../src/adapters/youtube/model.js";
import { MarkdownPosition } from "../../src/adapters/markdown/model.js";
import { YouTubeAdapter } from "../../src/adapters/youtube/youtube-adapter.js";
import { MarkdownAdapter } from "../../src/adapters/markdown/markdown-adapter.js";
import { PlayerState } from "../../src/core/state.js";
import { ytMdBridge } from "../../src/strategies/yt-markdown-bridge.js";

const mockYtLayer = Layer.succeed(YouTubeAdapter)({
  getLocation: Effect.succeed(
    Option.some(new YouTubeTimestamp({ seconds: 90 })),
  ),
  seekTo: () => Effect.void,
  getContent: Effect.succeed(""),
  getMetadata: Effect.succeed({}),
  locationChanges: Stream.empty,
  dispose: Effect.void,
  getChapters: Effect.succeed([
    new ChapterData({ title: "Intro", startSeconds: 0 }),
  ]),
  getPlayerState: Effect.succeed(PlayerState.Playing()),
  getVideoId: Effect.succeed(Option.some("abc123")),
});

const insertFn = vi.fn(() =>
  Effect.succeed({
    from: new MarkdownPosition({ line: 5, ch: 0 }),
    to: new MarkdownPosition({ line: 5, ch: 30 }),
  }),
);

const mockMdLayer = Layer.succeed(MarkdownAdapter)({
  getLocation: Effect.succeed(
    Option.some(new MarkdownPosition({ line: 5, ch: 0 })),
  ),
  seekTo: () => Effect.void,
  getContent: Effect.succeed("# Notes\n[1:30](https://youtube.com/watch?v=abc123&t=90)"),
  getMetadata: Effect.succeed({}),
  locationChanges: Stream.empty,
  dispose: Effect.void,
  insertTimestampLink: insertFn,
  getTimestampedLinks: Effect.succeed([]),
});

const testLayer = Layer.mergeAll(mockYtLayer, mockMdLayer);

describe("ytMdBridge", () => {
  it("produces a BridgeInstance with expected command IDs", async () => {
    const program = Effect.scoped(
      ytMdBridge.pipe(
        Effect.map((bridge) => {
          expect(bridge.id).toBe("yt-markdown");
          const ids = bridge.commands.map((c) => c.id);
          expect(ids).toContain("create-bookmarklet");
          expect(ids).toContain("bookmarklet-end");
          expect(ids).toContain("scan-next");
          expect(ids).toContain("scan-prev");
          expect(bridge.commands).toHaveLength(4);
        }),
      ),
    );
    await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
  });

  it("create-bookmarklet command executes without error", async () => {
    const program = Effect.scoped(
      ytMdBridge.pipe(
        Effect.flatMap((bridge) => {
          const cmd = bridge.commands.find((c) => c.id === "create-bookmarklet");
          expect(cmd).toBeDefined();
          return cmd!.execute;
        }),
      ),
    );
    await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    expect(insertFn).toHaveBeenCalledOnce();
  });

  it("scan-next command executes without error", async () => {
    const program = Effect.scoped(
      ytMdBridge.pipe(
        Effect.flatMap((bridge) => {
          const cmd = bridge.commands.find((c) => c.id === "scan-next");
          expect(cmd).toBeDefined();
          return cmd!.execute;
        }),
      ),
    );
    await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
  });

  it("scan-prev command executes without error", async () => {
    const program = Effect.scoped(
      ytMdBridge.pipe(
        Effect.flatMap((bridge) => {
          const cmd = bridge.commands.find((c) => c.id === "scan-prev");
          expect(cmd).toBeDefined();
          return cmd!.execute;
        }),
      ),
    );
    await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
  });
});
