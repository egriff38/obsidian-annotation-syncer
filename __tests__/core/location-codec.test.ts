import { describe, expect, it } from "vitest";
import { Option } from "effect";
import { YouTubeTimestamp, TimeRange } from "../../src/adapters/youtube/model.js";
import { MarkdownPosition, LineRange } from "../../src/adapters/markdown/model.js";
import { youtubeLocationCodec } from "../../src/adapters/youtube/youtube-location-codec.js";
import { markdownLocationCodec } from "../../src/adapters/markdown/markdown-location-codec.js";

describe("youtubeLocationCodec", () => {
  const codec = youtubeLocationCodec;

  describe("encode/decode roundtrip", () => {
    it("roundtrips minutes:seconds", () => {
      const ts = new YouTubeTimestamp({ seconds: 83 });
      const encoded = codec.encode(ts);
      expect(encoded).toBe("1:23");
      const decoded = codec.decode(encoded);
      expect(Option.isSome(decoded)).toBe(true);
      expect(Option.getOrThrow(decoded).seconds).toBe(83);
    });

    it("roundtrips hours:minutes:seconds", () => {
      const ts = new YouTubeTimestamp({ seconds: 3723 });
      const encoded = codec.encode(ts);
      expect(encoded).toBe("1:02:03");
      const decoded = codec.decode(encoded);
      expect(Option.isSome(decoded)).toBe(true);
      expect(Option.getOrThrow(decoded).seconds).toBe(3723);
    });

    it("handles zero", () => {
      const ts = new YouTubeTimestamp({ seconds: 0 });
      expect(codec.encode(ts)).toBe("0:00");
      const decoded = codec.decode("0:00");
      expect(Option.getOrThrow(decoded).seconds).toBe(0);
    });

    it("returns None for invalid input", () => {
      expect(Option.isNone(codec.decode("abc"))).toBe(true);
      expect(Option.isNone(codec.decode(""))).toBe(true);
      expect(Option.isNone(codec.decode("1:2:3:4"))).toBe(true);
    });
  });

  describe("compare", () => {
    it("returns -1 for earlier timestamp", () => {
      const a = new YouTubeTimestamp({ seconds: 10 });
      const b = new YouTubeTimestamp({ seconds: 20 });
      expect(codec.compare(a, b)).toBe(-1);
    });

    it("returns 0 for equal timestamps", () => {
      const a = new YouTubeTimestamp({ seconds: 10 });
      const b = new YouTubeTimestamp({ seconds: 10 });
      expect(codec.compare(a, b)).toBe(0);
    });

    it("returns 1 for later timestamp", () => {
      const a = new YouTubeTimestamp({ seconds: 20 });
      const b = new YouTubeTimestamp({ seconds: 10 });
      expect(codec.compare(a, b)).toBe(1);
    });
  });

  describe("contains", () => {
    it("returns true when in open-ended range", () => {
      const range = new TimeRange({ start: 10, end: Option.none() });
      expect(codec.contains(range, new YouTubeTimestamp({ seconds: 15 }))).toBe(true);
      expect(codec.contains(range, new YouTubeTimestamp({ seconds: 100 }))).toBe(true);
    });

    it("returns false when before range start", () => {
      const range = new TimeRange({ start: 10, end: Option.none() });
      expect(codec.contains(range, new YouTubeTimestamp({ seconds: 5 }))).toBe(false);
    });

    it("returns true when in closed range", () => {
      const range = new TimeRange({ start: 10, end: Option.some(20) });
      expect(codec.contains(range, new YouTubeTimestamp({ seconds: 15 }))).toBe(true);
      expect(codec.contains(range, new YouTubeTimestamp({ seconds: 10 }))).toBe(true);
      expect(codec.contains(range, new YouTubeTimestamp({ seconds: 20 }))).toBe(true);
    });

    it("returns false when outside closed range", () => {
      const range = new TimeRange({ start: 10, end: Option.some(20) });
      expect(codec.contains(range, new YouTubeTimestamp({ seconds: 5 }))).toBe(false);
      expect(codec.contains(range, new YouTubeTimestamp({ seconds: 25 }))).toBe(false);
    });
  });

  describe("regionFrom", () => {
    it("creates open-ended range from single location", () => {
      const start = new YouTubeTimestamp({ seconds: 10 });
      const region = Option.getOrThrow(codec.regionFrom(start));
      expect(region.start).toBe(10);
      expect(Option.isNone(region.end)).toBe(true);
    });

    it("creates closed range from two locations", () => {
      const start = new YouTubeTimestamp({ seconds: 10 });
      const end = new YouTubeTimestamp({ seconds: 20 });
      const region = Option.getOrThrow(codec.regionFrom(start, end));
      expect(region.start).toBe(10);
      expect(Option.getOrNull(region.end)).toBe(20);
    });
  });
});

describe("markdownLocationCodec", () => {
  const codec = markdownLocationCodec;

  describe("encode/decode roundtrip", () => {
    it("roundtrips a position", () => {
      const pos = new MarkdownPosition({ line: 42, ch: 10 });
      const encoded = codec.encode(pos);
      expect(encoded).toBe("L42:10");
      const decoded = codec.decode(encoded);
      expect(Option.isSome(decoded)).toBe(true);
      const val = Option.getOrThrow(decoded);
      expect(val.line).toBe(42);
      expect(val.ch).toBe(10);
    });

    it("handles zero position", () => {
      const pos = new MarkdownPosition({ line: 0, ch: 0 });
      expect(codec.encode(pos)).toBe("L0:0");
    });

    it("returns None for invalid input", () => {
      expect(Option.isNone(codec.decode("42:10"))).toBe(true);
      expect(Option.isNone(codec.decode("Labc:10"))).toBe(true);
      expect(Option.isNone(codec.decode(""))).toBe(true);
    });
  });

  describe("compare", () => {
    it("compares by line first", () => {
      const a = new MarkdownPosition({ line: 1, ch: 99 });
      const b = new MarkdownPosition({ line: 2, ch: 0 });
      expect(codec.compare(a, b)).toBe(-1);
    });

    it("compares by ch when lines are equal", () => {
      const a = new MarkdownPosition({ line: 5, ch: 3 });
      const b = new MarkdownPosition({ line: 5, ch: 10 });
      expect(codec.compare(a, b)).toBe(-1);
    });

    it("returns 0 for equal positions", () => {
      const a = new MarkdownPosition({ line: 5, ch: 3 });
      const b = new MarkdownPosition({ line: 5, ch: 3 });
      expect(codec.compare(a, b)).toBe(0);
    });
  });

  describe("contains", () => {
    it("returns true when inside range", () => {
      const range = new LineRange({
        fromLine: 1, fromCh: 0,
        toLine: 5, toCh: 10,
      });
      expect(codec.contains(range, new MarkdownPosition({ line: 3, ch: 5 }))).toBe(true);
    });

    it("returns true at boundaries", () => {
      const range = new LineRange({
        fromLine: 1, fromCh: 5,
        toLine: 5, toCh: 10,
      });
      expect(codec.contains(range, new MarkdownPosition({ line: 1, ch: 5 }))).toBe(true);
      expect(codec.contains(range, new MarkdownPosition({ line: 5, ch: 10 }))).toBe(true);
    });

    it("returns false before from", () => {
      const range = new LineRange({
        fromLine: 1, fromCh: 5,
        toLine: 5, toCh: 10,
      });
      expect(codec.contains(range, new MarkdownPosition({ line: 1, ch: 3 }))).toBe(false);
      expect(codec.contains(range, new MarkdownPosition({ line: 0, ch: 99 }))).toBe(false);
    });

    it("returns false after to", () => {
      const range = new LineRange({
        fromLine: 1, fromCh: 0,
        toLine: 5, toCh: 10,
      });
      expect(codec.contains(range, new MarkdownPosition({ line: 5, ch: 11 }))).toBe(false);
      expect(codec.contains(range, new MarkdownPosition({ line: 6, ch: 0 }))).toBe(false);
    });
  });

  describe("regionFrom", () => {
    it("creates single-point region from one position", () => {
      const pos = new MarkdownPosition({ line: 3, ch: 5 });
      const region = Option.getOrThrow(codec.regionFrom(pos));
      expect(region.fromLine).toBe(3);
      expect(region.fromCh).toBe(5);
      expect(region.toLine).toBe(3);
      expect(region.toCh).toBe(5);
    });

    it("creates range from two positions", () => {
      const start = new MarkdownPosition({ line: 1, ch: 0 });
      const end = new MarkdownPosition({ line: 5, ch: 10 });
      const region = Option.getOrThrow(codec.regionFrom(start, end));
      expect(region.fromLine).toBe(1);
      expect(region.toLine).toBe(5);
    });
  });
});
