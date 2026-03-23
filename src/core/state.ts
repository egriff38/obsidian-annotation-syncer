import { Data } from "effect";

// ── SyncState machine (Data.TaggedEnum — never serialized) ─────

export type SyncState = Data.TaggedEnum<{
  Idle: {};
  Tracking: { readonly currentRegion: unknown };
  Editing: {};
}>;
export const SyncState = Data.taggedEnum<SyncState>();

// ── PlayerState (Data.TaggedEnum — never serialized) ───────────

export type PlayerState = Data.TaggedEnum<{
  Playing: {};
  Paused: {};
  Ended: {};
  Buffering: {};
}>;
export const PlayerState = Data.taggedEnum<PlayerState>();
