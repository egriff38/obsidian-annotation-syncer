import { describe, expect, it } from "vitest";
import { Option } from "effect";
import { MarkdownPosition } from "../../../src/adapters/markdown/model.js";
import { markdownRegionResolver } from "../../../src/adapters/markdown/markdown-region-resolver.js";

const resolver = markdownRegionResolver;

describe("markdownRegionResolver", () => {
  describe("header regions", () => {
    it("resolves header to header + subcontent", () => {
      const doc = `# Title
Some paragraph content
More content
## Next Section
Other stuff`;
      const loc = new MarkdownPosition({ line: 0, ch: 0 });
      const result = resolver.resolveRegion(loc, doc, []);
      expect(Option.isSome(result)).toBe(true);
      const region = Option.getOrThrow(result);
      expect(region.fromLine).toBe(0);
      // h1 includes h2 subsections (only stops at same-or-higher level)
      expect(region.toLine).toBe(4);
    });

    it("stops at same-level header", () => {
      const doc = `## Section A
Content A
## Section B
Content B`;
      const loc = new MarkdownPosition({ line: 0, ch: 0 });
      const result = resolver.resolveRegion(loc, doc, []);
      const region = Option.getOrThrow(result);
      expect(region.fromLine).toBe(0);
      expect(region.toLine).toBe(1);
    });

    it("stops at higher-level header", () => {
      const doc = `### Sub Section
content
# Top Level`;
      const loc = new MarkdownPosition({ line: 0, ch: 0 });
      const result = resolver.resolveRegion(loc, doc, []);
      const region = Option.getOrThrow(result);
      expect(region.toLine).toBe(1);
    });

    it("stops at next timestamped location", () => {
      const doc = `## Section
Line 1
Line 2
Line 3`;
      const loc = new MarkdownPosition({ line: 0, ch: 0 });
      const tsLocations = [new MarkdownPosition({ line: 2, ch: 0 })];
      const result = resolver.resolveRegion(loc, doc, tsLocations);
      const region = Option.getOrThrow(result);
      expect(region.toLine).toBe(1);
    });
  });

  describe("paragraph regions", () => {
    it("resolves paragraph to blank line boundary", () => {
      const doc = `First paragraph line 1
First paragraph line 2

Second paragraph`;
      const loc = new MarkdownPosition({ line: 0, ch: 0 });
      const result = resolver.resolveRegion(loc, doc, []);
      const region = Option.getOrThrow(result);
      expect(region.fromLine).toBe(0);
      expect(region.toLine).toBe(1);
    });

    it("resolves single line paragraph", () => {
      const doc = `Single line

Next`;
      const loc = new MarkdownPosition({ line: 0, ch: 0 });
      const result = resolver.resolveRegion(loc, doc, []);
      const region = Option.getOrThrow(result);
      expect(region.fromLine).toBe(0);
      expect(region.toLine).toBe(0);
    });

    it("stops at next timestamp line", () => {
      const doc = `Line 1
Line 2
Line 3
Line 4`;
      const loc = new MarkdownPosition({ line: 0, ch: 0 });
      const tsLocations = [new MarkdownPosition({ line: 2, ch: 0 })];
      const result = resolver.resolveRegion(loc, doc, tsLocations);
      const region = Option.getOrThrow(result);
      expect(region.toLine).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("returns None for out-of-bounds line", () => {
      expect(
        Option.isNone(
          resolver.resolveRegion(
            new MarkdownPosition({ line: 100, ch: 0 }),
            "short doc",
            [],
          ),
        ),
      ).toBe(true);
    });

    it("returns None for negative line", () => {
      expect(
        Option.isNone(
          resolver.resolveRegion(
            new MarkdownPosition({ line: -1, ch: 0 }),
            "doc",
            [],
          ),
        ),
      ).toBe(true);
    });

    it("handles last line of document", () => {
      const doc = `Line 1
Line 2`;
      const loc = new MarkdownPosition({ line: 1, ch: 0 });
      const result = resolver.resolveRegion(loc, doc, []);
      const region = Option.getOrThrow(result);
      expect(region.fromLine).toBe(1);
      expect(region.toLine).toBe(1);
    });
  });
});
