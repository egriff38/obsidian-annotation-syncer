import { Effect, Option, Schema } from "effect";
import type { SyncBroker } from "../core/sync-broker.js";
import type { AdapterError, LinkData } from "../core/model.js";
import type { YouTubeTimestamp, ChapterData } from "../adapters/youtube/model.js";
import type { MarkdownPosition } from "../adapters/markdown/model.js";
import { snapToChapter } from "../adapters/youtube/chapter-scraper.js";
import { YouTubeLinkUrl } from "../adapters/youtube/youtube-link-url.js";
import type { ChordDetector } from "./chord-detector.js";

interface YtDeps {
  readonly yt: {
    readonly getLocation: Effect.Effect<
      Option.Option<YouTubeTimestamp>,
      AdapterError
    >;
    readonly getChapters: Effect.Effect<
      ReadonlyArray<ChapterData>,
      AdapterError
    >;
    readonly getVideoId: Effect.Effect<Option.Option<string>, AdapterError>;
  };
  readonly md: {
    readonly getLocation: Effect.Effect<
      Option.Option<MarkdownPosition>,
      AdapterError
    >;
    readonly insertTimestampLink: (
      link: LinkData,
      position: MarkdownPosition,
    ) => Effect.Effect<
      { readonly from: MarkdownPosition; readonly to: MarkdownPosition },
      AdapterError
    >;
  };
  readonly chordDetector: ChordDetector;
}

interface BrokerDeps<SL, SR, AL, AR> {
  readonly broker: SyncBroker<SL, SR, AL, AR>;
}

export function makeCreateBookmarklet(deps: YtDeps) {
  return Effect.gen(function* () {
    const loc = yield* deps.yt.getLocation;
    if (Option.isNone(loc)) return;

    const chapters = yield* deps.yt.getChapters;
    const snapped = snapToChapter(loc.value.seconds, chapters);

    const videoId = yield* deps.yt.getVideoId;
    if (Option.isNone(videoId)) return;

    const rawUrl = `https://youtube.com/watch?v=${videoId.value}&t=${snapped}`;
    const link = yield* Schema.decodeEffect(YouTubeLinkUrl)(rawUrl);

    const cursor = yield* deps.md.getLocation;
    if (Option.isNone(cursor)) return;

    const result = yield* deps.md.insertTimestampLink(link, cursor.value);

    yield* deps.chordDetector.recordAction({
      timestamp: Date.now(),
      linkFrom: { line: result.from.line, ch: result.from.ch },
      linkTo: { line: result.to.line, ch: result.to.ch },
    });
  });
}

export function makeBookmarkletEnd(deps: YtDeps) {
  return Effect.gen(function* () {
    const chord = yield* deps.chordDetector.detectChord(Date.now());
    if (Option.isNone(chord)) {
      return yield* makeCreateBookmarklet(deps);
    }

    const loc = yield* deps.yt.getLocation;
    if (Option.isNone(loc)) return;
    void chord.value;
    void loc.value;
  });
}

export function makeScanNext<SL, SR, AL, AR>(
  deps: BrokerDeps<SL, SR, AL, AR>,
) {
  return Effect.gen(function* () {
    const _track = yield* deps.broker.getCurrentTrack();
    void _track;
  });
}

export function makeScanPrev<SL, SR, AL, AR>(
  deps: BrokerDeps<SL, SR, AL, AR>,
) {
  return Effect.gen(function* () {
    const _track = yield* deps.broker.getCurrentTrack();
    void _track;
  });
}
