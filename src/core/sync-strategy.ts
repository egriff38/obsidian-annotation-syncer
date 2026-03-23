import type { Option } from "effect";
import type { TrackEntry } from "./model.js";

/**
 * Defines the sync behavior between a source leaf and an annotation leaf.
 * Concrete implementations decide how to derive regions, build tracks,
 * and translate locations between the two domains.
 */
export interface SyncStrategy<SL, SR, AL, AR> {
  readonly deriveRegion: (
    sourceLoc: SL,
    track: ReadonlyArray<TrackEntry<SL | AL>>,
    annotationContent: string,
  ) => Option.Option<SR | AR>;
  readonly buildTrack: (
    sourceEntries: ReadonlyArray<TrackEntry<SL>>,
    annotationEntries: ReadonlyArray<TrackEntry<AL>>,
  ) => ReadonlyArray<TrackEntry<SL | AL>>;
  readonly translateLocation: (loc: SL) => Option.Option<AL>;
}
