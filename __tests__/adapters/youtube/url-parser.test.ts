import { describe, expect, it } from "vitest";
import { Option } from "effect";
import {
  parseYouTubeUrl,
  formatTimestamp,
  parseTimestamp,
} from "../../../src/adapters/youtube/url-parser.js";

describe("parseYouTubeUrl", () => {
  it("parses youtube.com/watch?v= with timestamp", () => {
    const result = parseYouTubeUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90",
    );
    expect(Option.isSome(result)).toBe(true);
    const val = Option.getOrThrow(result);
    expect(val.videoId).toBe("dQw4w9WgXcQ");
    expect(Option.getOrNull(val.timestamp)).toBe(90);
    expect(Option.isNone(val.endTimestamp)).toBe(true);
  });

  it("parses youtube.com/watch?v= with t=90s", () => {
    const result = parseYouTubeUrl(
      "https://youtube.com/watch?v=abc123&t=90s",
    );
    const val = Option.getOrThrow(result);
    expect(val.videoId).toBe("abc123");
    expect(Option.getOrNull(val.timestamp)).toBe(90);
  });

  it("parses youtube.com/watch?v= with t=1m30s", () => {
    const result = parseYouTubeUrl(
      "https://youtube.com/watch?v=abc123&t=1m30s",
    );
    const val = Option.getOrThrow(result);
    expect(Option.getOrNull(val.timestamp)).toBe(90);
  });

  it("parses youtube.com/watch?v= with t=1h2m3s", () => {
    const result = parseYouTubeUrl(
      "https://youtube.com/watch?v=abc123&t=1h2m3s",
    );
    const val = Option.getOrThrow(result);
    expect(Option.getOrNull(val.timestamp)).toBe(3723);
  });

  it("parses youtu.be/ short URL", () => {
    const result = parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ?t=42");
    expect(Option.isSome(result)).toBe(true);
    const val = Option.getOrThrow(result);
    expect(val.videoId).toBe("dQw4w9WgXcQ");
    expect(Option.getOrNull(val.timestamp)).toBe(42);
  });

  it("parses URL without timestamp", () => {
    const result = parseYouTubeUrl(
      "https://youtube.com/watch?v=dQw4w9WgXcQ",
    );
    const val = Option.getOrThrow(result);
    expect(val.videoId).toBe("dQw4w9WgXcQ");
    expect(Option.isNone(val.timestamp)).toBe(true);
  });

  it("parses custom &end= parameter", () => {
    const result = parseYouTubeUrl(
      "https://youtube.com/watch?v=abc&t=10&end=20",
    );
    const val = Option.getOrThrow(result);
    expect(Option.getOrNull(val.timestamp)).toBe(10);
    expect(Option.getOrNull(val.endTimestamp)).toBe(20);
  });

  it("parses m.youtube.com", () => {
    const result = parseYouTubeUrl(
      "https://m.youtube.com/watch?v=abc123",
    );
    const val = Option.getOrThrow(result);
    expect(val.videoId).toBe("abc123");
  });

  it("returns None for non-YouTube URL", () => {
    expect(Option.isNone(parseYouTubeUrl("https://example.com"))).toBe(true);
  });

  it("returns None for malformed URL", () => {
    expect(Option.isNone(parseYouTubeUrl("not-a-url"))).toBe(true);
  });

  it("returns None for YouTube without video ID", () => {
    expect(
      Option.isNone(parseYouTubeUrl("https://youtube.com/")),
    ).toBe(true);
  });
});

describe("formatTimestamp", () => {
  it("formats seconds only", () => {
    expect(formatTimestamp(5)).toBe("0:05");
  });

  it("formats minutes and seconds", () => {
    expect(formatTimestamp(83)).toBe("1:23");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatTimestamp(3723)).toBe("1:02:03");
  });

  it("handles zero", () => {
    expect(formatTimestamp(0)).toBe("0:00");
  });

  it("pads seconds correctly", () => {
    expect(formatTimestamp(60)).toBe("1:00");
  });
});

describe("parseTimestamp", () => {
  it("parses minutes:seconds", () => {
    expect(Option.getOrNull(parseTimestamp("1:23"))).toBe(83);
  });

  it("parses hours:minutes:seconds", () => {
    expect(Option.getOrNull(parseTimestamp("1:02:03"))).toBe(3723);
  });

  it("returns None for invalid format", () => {
    expect(Option.isNone(parseTimestamp("abc"))).toBe(true);
    expect(Option.isNone(parseTimestamp("1"))).toBe(true);
  });

  it("roundtrips with formatTimestamp", () => {
    for (const seconds of [0, 5, 83, 3600, 3723]) {
      const formatted = formatTimestamp(seconds);
      const parsed = Option.getOrThrow(parseTimestamp(formatted));
      expect(parsed).toBe(seconds);
    }
  });
});
