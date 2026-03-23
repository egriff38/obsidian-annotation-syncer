import type { Effect, Option, Stream } from "effect";
import type { AdapterError } from "./model.js";

export interface LeafAdapter<L, R> {
  readonly getLocation: Effect.Effect<Option.Option<L>, AdapterError>;
  readonly seekTo: (location: L) => Effect.Effect<void, AdapterError>;
  readonly getContent: Effect.Effect<string, AdapterError>;
  readonly getMetadata: Effect.Effect<Record<string, unknown>, AdapterError>;
  readonly locationChanges: Stream.Stream<L, AdapterError>;
  readonly dispose: Effect.Effect<void>;
}
