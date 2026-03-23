import { Option } from "effect";
import type { SyncStrategy } from "../core/sync-strategy.js";
import type { YouTubeTimestamp, TimeRange } from "../adapters/youtube/model.js";
import type { MarkdownPosition, LineRange } from "../adapters/markdown/model.js";

export const ytMdStrategy: SyncStrategy<
  YouTubeTimestamp,
  TimeRange,
  MarkdownPosition,
  LineRange
> = {
  deriveRegion: (_sourceLoc: YouTubeTimestamp, _track, _content) => Option.none(),
  buildTrack: (source, annotation) => [...source, ...annotation],
  translateLocation: (_loc: YouTubeTimestamp) => Option.none(),
};
