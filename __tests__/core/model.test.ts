import { describe, expect, it } from "vitest";
import { Match, Option } from "effect";
import {
  YouTubeTimestamp,
  ChapterData,
  TimeRange,
} from "../../src/adapters/youtube/model.js";
import {
  MarkdownPosition,
  LineRange,
} from "../../src/adapters/markdown/model.js";
import {
  GenericOffset,
  GenericRange,
  LinkData,
} from "../../src/core/model.js";
import { SyncState, PlayerState } from "../../src/core/state.js";

describe("Location types", () => {
  it("constructs YouTubeTimestamp with _tag", () => {
    const ts = new YouTubeTimestamp({ seconds: 90 });
    expect(ts._tag).toBe("YouTubeTimestamp");
    expect(ts.seconds).toBe(90);
  });

  it("constructs MarkdownPosition with _tag", () => {
    const pos = new MarkdownPosition({ line: 10, ch: 5 });
    expect(pos._tag).toBe("MarkdownPosition");
    expect(pos.line).toBe(10);
    expect(pos.ch).toBe(5);
  });

  it("constructs GenericOffset with _tag", () => {
    const offset = new GenericOffset({ offset: 42 });
    expect(offset._tag).toBe("GenericOffset");
    expect(offset.offset).toBe(42);
  });
});

describe("Region types", () => {
  it("constructs TimeRange with optional end", () => {
    const open = new TimeRange({ start: 10, end: Option.none() });
    expect(open._tag).toBe("TimeRange");
    expect(open.start).toBe(10);
    expect(Option.isNone(open.end)).toBe(true);

    const closed = new TimeRange({ start: 10, end: Option.some(20) });
    expect(Option.getOrNull(closed.end)).toBe(20);
  });

  it("constructs LineRange", () => {
    const range = new LineRange({
      fromLine: 1,
      fromCh: 0,
      toLine: 5,
      toCh: 10,
    });
    expect(range._tag).toBe("LineRange");
    expect(range.fromLine).toBe(1);
    expect(range.toCh).toBe(10);
  });

  it("constructs GenericRange", () => {
    const range = new GenericRange({ start: 0, end: 100 });
    expect(range._tag).toBe("GenericRange");
    expect(range.start).toBe(0);
    expect(range.end).toBe(100);
  });
});

describe("Domain types", () => {
  it("constructs ChapterData", () => {
    const chapter = new ChapterData({ title: "Intro", startSeconds: 0 });
    expect(chapter.title).toBe("Intro");
    expect(chapter.startSeconds).toBe(0);
  });

  it("constructs LinkData with optional timestamps", () => {
    const link = new LinkData({
      url: "https://youtube.com/watch?v=abc",
      timestamp: Option.some(90),
      endTimestamp: Option.none(),
    });
    expect(link.url).toBe("https://youtube.com/watch?v=abc");
    expect(Option.getOrNull(link.timestamp)).toBe(90);
    expect(Option.isNone(link.endTimestamp)).toBe(true);
  });
});

describe("SyncState (Data.TaggedEnum)", () => {
  it("constructs Idle", () => {
    const state = SyncState.Idle();
    expect(state._tag).toBe("Idle");
  });

  it("constructs Tracking with region", () => {
    const region = { start: 0, end: 10 };
    const state = SyncState.Tracking({ currentRegion: region });
    expect(state._tag).toBe("Tracking");
  });

  it("constructs Editing", () => {
    const state = SyncState.Editing();
    expect(state._tag).toBe("Editing");
  });

  it("supports exhaustive $match", () => {
    const describe = SyncState.$match({
      Idle: () => "idle" as const,
      Tracking: () => "tracking" as const,
      Editing: () => "editing" as const,
    });

    expect(describe(SyncState.Idle())).toBe("idle");
    expect(describe(SyncState.Tracking({ currentRegion: null }))).toBe(
      "tracking",
    );
    expect(describe(SyncState.Editing())).toBe("editing");
  });

  it("supports $is type guard", () => {
    const state = SyncState.Tracking({ currentRegion: "test" });
    expect(SyncState.$is("Tracking")(state)).toBe(true);
    expect(SyncState.$is("Idle")(state)).toBe(false);
  });
});

describe("PlayerState (Data.TaggedEnum)", () => {
  it("constructs all variants", () => {
    expect(PlayerState.Playing()._tag).toBe("Playing");
    expect(PlayerState.Paused()._tag).toBe("Paused");
    expect(PlayerState.Ended()._tag).toBe("Ended");
    expect(PlayerState.Buffering()._tag).toBe("Buffering");
  });

  it("supports exhaustive $match", () => {
    const describe = PlayerState.$match({
      Playing: () => "playing" as const,
      Paused: () => "paused" as const,
      Ended: () => "ended" as const,
      Buffering: () => "buffering" as const,
    });

    expect(describe(PlayerState.Playing())).toBe("playing");
    expect(describe(PlayerState.Paused())).toBe("paused");
    expect(describe(PlayerState.Ended())).toBe("ended");
    expect(describe(PlayerState.Buffering())).toBe("buffering");
  });
});

describe("Pattern matching on concrete types", () => {
  it("matches Location types exhaustively at composition site", () => {
    type AppLocation = YouTubeTimestamp | MarkdownPosition;
    const describeLocation = Match.type<AppLocation>().pipe(
      Match.tag("YouTubeTimestamp", ({ seconds }) => `YT@${seconds}s`),
      Match.tag(
        "MarkdownPosition",
        ({ line, ch }) => `MD L${line}:${ch}`,
      ),
      Match.exhaustive,
    );

    const yt = new YouTubeTimestamp({ seconds: 42 });
    const md = new MarkdownPosition({ line: 10, ch: 5 });

    expect(describeLocation(yt)).toBe("YT@42s");
    expect(describeLocation(md)).toBe("MD L10:5");
  });
});
