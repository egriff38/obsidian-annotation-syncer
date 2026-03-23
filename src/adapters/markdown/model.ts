import { Schema } from "effect";

export class MarkdownPosition extends Schema.TaggedClass<MarkdownPosition>()(
  "MarkdownPosition",
  { line: Schema.Number, ch: Schema.Number },
) {}

export class LineRange extends Schema.TaggedClass<LineRange>()("LineRange", {
  fromLine: Schema.Number,
  fromCh: Schema.Number,
  toLine: Schema.Number,
  toCh: Schema.Number,
}) {}

export class EditorNotFoundError extends Schema.TaggedErrorClass<EditorNotFoundError>()(
  "EditorNotFoundError",
  { message: Schema.String },
) {}
