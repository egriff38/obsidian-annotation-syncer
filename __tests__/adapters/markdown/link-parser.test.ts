import { describe, expect, it } from "vitest";
import { Option } from "effect";
import { parseTimestampedLinks } from "../../../src/adapters/markdown/link-parser.js";

describe("parseTimestampedLinks", () => {
  it("parses a single youtube.com link with timestamp", () => {
    const md = `Check [1:23](https://youtube.com/watch?v=abc&t=83) this out`;
    const links = parseTimestampedLinks(md);
    expect(links).toHaveLength(1);
    expect(links[0]!.url).toBe("https://youtube.com/watch?v=abc");
    expect(Option.getOrNull(links[0]!.timestamp)).toBe(83);
  });

  it("parses youtu.be short link", () => {
    const md = `See [0:42](https://youtu.be/xyz?t=42)`;
    const links = parseTimestampedLinks(md);
    expect(links).toHaveLength(1);
    expect(Option.getOrNull(links[0]!.timestamp)).toBe(42);
  });

  it("parses link with end parameter", () => {
    const md = `[clip](https://youtube.com/watch?v=abc&t=10&end=20)`;
    const links = parseTimestampedLinks(md);
    expect(links).toHaveLength(1);
    expect(Option.getOrNull(links[0]!.timestamp)).toBe(10);
    expect(Option.getOrNull(links[0]!.endTimestamp)).toBe(20);
  });

  it("parses multiple links", () => {
    const md = `[a](https://youtube.com/watch?v=abc&t=10) text [b](https://youtube.com/watch?v=def&t=20)`;
    const links = parseTimestampedLinks(md);
    expect(links).toHaveLength(2);
  });

  it("handles link without timestamp", () => {
    const md = `[video](https://youtube.com/watch?v=abc)`;
    const links = parseTimestampedLinks(md);
    expect(links).toHaveLength(1);
    expect(Option.isNone(links[0]!.timestamp)).toBe(true);
  });

  it("handles www prefix", () => {
    const md = `[x](https://www.youtube.com/watch?v=abc&t=5)`;
    const links = parseTimestampedLinks(md);
    expect(links).toHaveLength(1);
  });

  it("ignores non-YouTube links", () => {
    const md = `[other](https://example.com/page)`;
    const links = parseTimestampedLinks(md);
    expect(links).toHaveLength(0);
  });

  it("returns empty for no links", () => {
    expect(parseTimestampedLinks("No links here")).toHaveLength(0);
    expect(parseTimestampedLinks("")).toHaveLength(0);
  });

  it("handles malformed links gracefully", () => {
    const md = `[broken(https://youtube.com/watch?v=abc)
[another](not-a-url)`;
    const links = parseTimestampedLinks(md);
    expect(links).toHaveLength(0);
  });
});
