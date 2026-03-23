import {
  Effect,
  Layer,
  Match,
  Option,
  Schedule,
  Schema,
  ServiceMap,
  Stream,
} from "effect";
import type { LeafAdapter } from "../../core/leaf-adapter.js";
import {
  AdapterError,
} from "../../core/model.js";
import {
  ChapterData,
  YouTubeTimestamp,
  TimeRange,
} from "./model.js";
import type { PlayerState } from "../../core/state.js";
import { PlayerState as PlayerStateEnum } from "../../core/state.js";
import { WebViewBridge } from "./web-view-bridge.js";
import { parseChaptersFromDescription, snapToChapter } from "./chapter-scraper.js";

const toAdapterError = (context: string) => (e: unknown) =>
  new AdapterError({ message: `${context}: ${e}`, adapter: "youtube" });

export class YouTubeAdapter extends ServiceMap.Service<
  YouTubeAdapter,
  LeafAdapter<YouTubeTimestamp, TimeRange> & {
    readonly getChapters: Effect.Effect<
      ReadonlyArray<ChapterData>,
      AdapterError
    >;
    readonly getPlayerState: Effect.Effect<PlayerState, AdapterError>;
    readonly getVideoId: Effect.Effect<Option.Option<string>, AdapterError>;
  }
>()("annotation-syncer/YouTubeAdapter") {
  static layer: Layer.Layer<YouTubeAdapter, never, WebViewBridge> =
    Layer.effect(
      YouTubeAdapter,
    )(
      Effect.gen(function* () {
        const bridge = yield* WebViewBridge;

        const getCurrentTime = bridge
          .eval(
            "document.querySelector('video')?.currentTime ?? 0",
            Schema.Number,
          )
          .pipe(Effect.map((s) => new YouTubeTimestamp({ seconds: s })));

        const seekTo = (loc: YouTubeTimestamp) =>
          bridge
            .eval(
              `document.querySelector('video').currentTime = ${loc.seconds}`,
              Schema.Unknown,
            )
            .pipe(Effect.asVoid, Effect.mapError(toAdapterError("seekTo")));

        const getPlayerState = Effect.gen(function* () {
          const raw = yield* bridge.eval(
            `(() => {
              const v = document.querySelector('video');
              if (!v) return 'Paused';
              if (v.ended) return 'Ended';
              if (v.paused) return 'Paused';
              if (v.readyState < 3) return 'Buffering';
              return 'Playing';
            })()`,
            Schema.String,
          );
          return Match.value(raw).pipe(
            Match.when("Playing", () => PlayerStateEnum.Playing() as PlayerState),
            Match.when("Paused", () => PlayerStateEnum.Paused() as PlayerState),
            Match.when("Ended", () => PlayerStateEnum.Ended() as PlayerState),
            Match.when("Buffering", () => PlayerStateEnum.Buffering() as PlayerState),
            Match.orElse(() => PlayerStateEnum.Paused() as PlayerState),
          );
        }).pipe(Effect.mapError(toAdapterError("getPlayerState")));

        const getVideoId = Effect.gen(function* () {
          const url = yield* bridge.getURL;
          const match = url.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?#]+)/,
          );
          return Option.fromNullishOr(match?.[1]);
        }).pipe(Effect.mapError(toAdapterError("getVideoId")));

        const getChapters = Effect.gen(function* () {
          const raw = yield* bridge.eval(
            `JSON.stringify(
              window.ytInitialPlayerResponse?.videoDetails?.shortDescription ?? ""
            )`,
            Schema.String,
          );
          return parseChaptersFromDescription(raw);
        }).pipe(Effect.mapError(toAdapterError("getChapters")));

        const locationChanges: Stream.Stream<YouTubeTimestamp, AdapterError> =
          Stream.fromEffectRepeat(
            getCurrentTime.pipe(Effect.mapError(toAdapterError("poll"))),
          ).pipe(Stream.schedule(Schedule.spaced("250 millis")));

        return YouTubeAdapter.of({
          getLocation: getCurrentTime.pipe(
            Effect.map(Option.some),
            Effect.mapError(toAdapterError("getLocation")),
          ),
          seekTo,
          getContent: Effect.succeed(""),
          getMetadata: bridge.getURL.pipe(
            Effect.map((url) => ({ url }) as Record<string, unknown>),
            Effect.mapError(toAdapterError("getMetadata")),
          ),
          locationChanges,
          dispose: Effect.void,
          getChapters,
          getPlayerState,
          getVideoId,
        });
      }),
    );
}

export { snapToChapter };
