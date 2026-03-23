import { type Option, Schema } from "effect";

// ── Structural constraint for generic core ─────────────────────

export interface Tagged {
  readonly _tag: string;
}

// ── Generic core types ─────────────────────────────────────────

export interface TrackEntry<L> {
  readonly location: L;
  readonly source: "annotation" | "target";
  readonly label: Option.Option<string>;
}

// ── Bridge domain types ────────────────────────────────────────

export class LinkData extends Schema.Class<LinkData>("LinkData")({
  url: Schema.String,
  timestamp: Schema.OptionFromNullOr(Schema.Number),
  endTimestamp: Schema.OptionFromNullOr(Schema.Number),
}) {}

// ── Generic offset/range (speculative, for future adapters) ────

export class GenericOffset extends Schema.TaggedClass<GenericOffset>()(
  "GenericOffset",
  { offset: Schema.Number },
) {}

export class GenericRange extends Schema.TaggedClass<GenericRange>()(
  "GenericRange",
  {
    start: Schema.Number,
    end: Schema.Number,
  },
) {}

// ── Errors ─────────────────────────────────────────────────────

export class AdapterError extends Schema.TaggedErrorClass<AdapterError>()(
  "AdapterError",
  { message: Schema.String, adapter: Schema.String },
) {}

export class SyncError extends Schema.TaggedErrorClass<SyncError>()(
  "SyncError",
  { message: Schema.String },
) {}
