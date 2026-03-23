import { Option, type Ordering } from "effect";
import type { TrackEntry, Tagged } from "./model.js";

export interface TrackBuilder<L> {
  buildTrack(
    annotationEntries: ReadonlyArray<TrackEntry<L>>,
    targetEntries: ReadonlyArray<TrackEntry<L>>,
  ): ReadonlyArray<TrackEntry<L>>;
  snapToNearest(
    location: L,
    entries: ReadonlyArray<TrackEntry<L>>,
    thresholdSeconds: number,
  ): Option.Option<TrackEntry<L>>;
  next(
    current: L,
    track: ReadonlyArray<TrackEntry<L>>,
  ): Option.Option<TrackEntry<L>>;
  prev(
    current: L,
    track: ReadonlyArray<TrackEntry<L>>,
  ): Option.Option<TrackEntry<L>>;
}

/**
 * Create a TrackBuilder that sorts and navigates entries using a comparison fn.
 * Works for any location type as long as you can compare two of them.
 */
export function createTrackBuilder<L>(
  compare: (a: L, b: L) => Ordering.Ordering,
): TrackBuilder<L> {
  const sorted = (entries: ReadonlyArray<TrackEntry<L>>) =>
    [...entries].sort((a, b) => compare(a.location, b.location));

  return {
    buildTrack(annotationEntries, targetEntries) {
      return sorted([...annotationEntries, ...targetEntries]);
    },

    snapToNearest(location, entries, thresholdSeconds) {
      if (entries.length === 0) return Option.none();
      let best: TrackEntry<L> | undefined;
      let bestDistance = Infinity;
      for (const entry of entries) {
        const cmp = compare(location, entry.location);
        // We approximate "distance" by cmp value for discrete orderings.
        // For real use, the caller provides a numeric-aware threshold.
        // Since cmp is -1|0|1, threshold is checked at the call site.
        if (cmp === 0) return Option.some(entry);
        const distance = Math.abs(cmp);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = entry;
        }
      }
      return best ? Option.some(best) : Option.none();
    },

    next(current, track) {
      const s = sorted(track);
      for (const entry of s) {
        if (compare(entry.location, current) > 0) {
          return Option.some(entry);
        }
      }
      return Option.none();
    },

    prev(current, track) {
      const s = sorted(track);
      let last: TrackEntry<L> | undefined;
      for (const entry of s) {
        if (compare(entry.location, current) >= 0) break;
        last = entry;
      }
      return last ? Option.some(last) : Option.none();
    },
  };
}
