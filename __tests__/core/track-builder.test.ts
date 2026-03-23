import { describe, expect, it } from "vitest";
import { Option } from "effect";
import { YouTubeTimestamp } from "../../src/adapters/youtube/model.js";
import type { TrackEntry } from "../../src/core/model.js";
import { createTrackBuilder } from "../../src/core/track-builder.js";
import { youtubeLocationCodec } from "../../src/adapters/youtube/youtube-location-codec.js";

const builder = createTrackBuilder<YouTubeTimestamp>(
  youtubeLocationCodec.compare,
);

function entry(
  seconds: number,
  source: "annotation" | "target" = "target",
): TrackEntry<YouTubeTimestamp> {
  return {
    location: new YouTubeTimestamp({ seconds }),
    source,
    label: Option.none(),
  };
}

describe("TrackBuilder", () => {
  describe("buildTrack", () => {
    it("merges and sorts entries from both sources", () => {
      const annotation = [entry(60, "annotation"), entry(10, "annotation")];
      const target = [entry(30, "target"), entry(90, "target")];
      const track = builder.buildTrack(annotation, target);
      expect(track.map((e) => e.location.seconds)).toEqual([10, 30, 60, 90]);
    });

    it("handles empty inputs", () => {
      expect(builder.buildTrack([], [])).toEqual([]);
      expect(builder.buildTrack([entry(5, "annotation")], [])).toHaveLength(1);
    });
  });

  describe("next", () => {
    const track = [entry(10), entry(30), entry(60), entry(90)];

    it("returns next entry after current", () => {
      const loc = new YouTubeTimestamp({ seconds: 10 });
      const result = builder.next(loc, track);
      expect(Option.getOrThrow(result).location.seconds).toBe(30);
    });

    it("returns next when between entries", () => {
      const loc = new YouTubeTimestamp({ seconds: 45 });
      const result = builder.next(loc, track);
      expect(Option.getOrThrow(result).location.seconds).toBe(60);
    });

    it("returns None when at end", () => {
      const loc = new YouTubeTimestamp({ seconds: 90 });
      expect(Option.isNone(builder.next(loc, track))).toBe(true);
    });

    it("returns None for empty track", () => {
      const loc = new YouTubeTimestamp({ seconds: 0 });
      expect(Option.isNone(builder.next(loc, []))).toBe(true);
    });
  });

  describe("prev", () => {
    const track = [entry(10), entry(30), entry(60), entry(90)];

    it("returns previous entry before current", () => {
      const loc = new YouTubeTimestamp({ seconds: 60 });
      const result = builder.prev(loc, track);
      expect(Option.getOrThrow(result).location.seconds).toBe(30);
    });

    it("returns prev when between entries", () => {
      const loc = new YouTubeTimestamp({ seconds: 45 });
      const result = builder.prev(loc, track);
      expect(Option.getOrThrow(result).location.seconds).toBe(30);
    });

    it("returns None when at beginning", () => {
      const loc = new YouTubeTimestamp({ seconds: 10 });
      expect(Option.isNone(builder.prev(loc, track))).toBe(true);
    });

    it("returns None for empty track", () => {
      const loc = new YouTubeTimestamp({ seconds: 0 });
      expect(Option.isNone(builder.prev(loc, []))).toBe(true);
    });
  });

  describe("snapToNearest", () => {
    const track = [entry(10), entry(60)];

    it("returns exact match", () => {
      const loc = new YouTubeTimestamp({ seconds: 10 });
      const result = builder.snapToNearest(loc, track, 5);
      expect(Option.getOrThrow(result).location.seconds).toBe(10);
    });

    it("returns None for empty entries", () => {
      const loc = new YouTubeTimestamp({ seconds: 10 });
      expect(Option.isNone(builder.snapToNearest(loc, [], 5))).toBe(true);
    });
  });
});
