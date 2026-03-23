import { Schema } from "effect";

export class YouTubeTimestamp extends Schema.TaggedClass<YouTubeTimestamp>()(
  "YouTubeTimestamp",
  { seconds: Schema.Number },
) {}

export class TimeRange extends Schema.TaggedClass<TimeRange>()("TimeRange", {
  start: Schema.Number,
  end: Schema.OptionFromNullOr(Schema.Number),
}) {}

export class ChapterData extends Schema.Class<ChapterData>("ChapterData")({
  title: Schema.String,
  startSeconds: Schema.Number,
}) {}

export class WebViewBridgeError extends Schema.TaggedErrorClass<WebViewBridgeError>()(
  "WebViewBridgeError",
  { message: Schema.String, cause: Schema.optional(Schema.Defect) },
) {}
