import { describe, expect, it } from "vitest";
import { Option } from "effect";
import { computePlacement } from "../../../src/adapters/markdown/bookmark-placer.js";
import { parseLocatedLinks } from "../../../src/adapters/markdown/link-parser.js";
import { formatTimestamp } from "../../../src/adapters/youtube/url-parser.js";

function place(content: string, newSeconds: number, cursorLine = 0) {
  const links = parseLocatedLinks(content);
  const label = formatTimestamp(newSeconds);
  const mdLink = `[${label}](https://youtube.com/watch?v=abc&t=${newSeconds})`;
  return computePlacement(content, links, newSeconds, mdLink, cursorLine);
}

describe("computePlacement", () => {
  describe("empty document", () => {
    it("inserts at cursor when no existing links", () => {
      const result = place("# My Notes\n\nSome text", 30, 2);
      expect(result.line).toBe(2);
      expect(result.ch).toBe(0);
      expect(result.text).toContain("[0:30]");
    });
  });

  describe("list style", () => {
    const doc = [
      "# Video Notes",
      "",
      "- [0:10](https://youtube.com/watch?v=abc&t=10) Intro",
      "- [0:50](https://youtube.com/watch?v=abc&t=50) Middle",
      "- [1:30](https://youtube.com/watch?v=abc&t=90) End",
    ].join("\n");

    it("inserts before next entry in chronological order", () => {
      const result = place(doc, 30);
      expect(result.line).toBe(3);
      expect(result.text).toMatch(/^- \[0:30\]/);
    });

    it("inserts at end when after all entries", () => {
      const result = place(doc, 120);
      expect(result.line).toBe(5);
      expect(result.text).toMatch(/^- \[2:00\]/);
    });

    it("inserts before first entry when before all", () => {
      const result = place(doc, 5);
      expect(result.line).toBe(2);
      expect(result.text).toMatch(/^- \[0:05\]/);
    });
  });

  describe("heading style", () => {
    const doc = [
      "# Video Notes",
      "",
      "## [0:10](https://youtube.com/watch?v=abc&t=10) Intro",
      "Some notes about the intro",
      "",
      "## [1:30](https://youtube.com/watch?v=abc&t=90) Main Topic",
      "Notes about main topic",
    ].join("\n");

    it("inserts heading before next entry", () => {
      const result = place(doc, 45);
      expect(result.line).toBe(5);
      expect(result.text).toMatch(/^## \[0:45\]/);
      expect(result.text).toMatch(/\n\n$/);
    });

    it("appends heading after last entry", () => {
      const result = place(doc, 120);
      expect(result.text).toMatch(/## \[2:00\]/);
      expect(result.text).toMatch(/\n\n$/);
    });
  });

  describe("interstitial non-timestamped sections", () => {
    const doc = [
      "## [0:10](https://youtube.com/watch?v=abc&t=10) Intro",
      "Intro notes",
      "",
      "## My Thoughts",
      "Some unrelated thoughts",
      "",
      "## [2:00](https://youtube.com/watch?v=abc&t=120) Next Section",
      "Next section notes",
    ].join("\n");

    it("inserts above next timestamped entry, after non-timestamped section", () => {
      const result = place(doc, 60);
      expect(result.line).toBe(6);
      expect(result.text).toMatch(/^## \[1:00\]/);
    });
  });

  describe("mixed styles (match next entry)", () => {
    const doc = [
      "## [0:10](https://youtube.com/watch?v=abc&t=10) Intro",
      "",
      "- [1:00](https://youtube.com/watch?v=abc&t=60) Detail point",
      "- [2:00](https://youtube.com/watch?v=abc&t=120) Another point",
    ].join("\n");

    it("matches next entry's style when inserting between", () => {
      const result = place(doc, 80);
      expect(result.line).toBe(3);
      expect(result.text).toMatch(/^- \[1:20\]/);
    });
  });

  describe("heading padding", () => {
    const doc = [
      "## [0:10](https://youtube.com/watch?v=abc&t=10) Intro",
      "Notes",
      "",
      "## [2:00](https://youtube.com/watch?v=abc&t=120) End",
    ].join("\n");

    it("includes blank line after heading insertion", () => {
      const result = place(doc, 60);
      expect(result.text).toMatch(/## \[1:00\].*\n\n$/);
    });

    it("includes blank line when appending heading", () => {
      const result = place(doc, 180);
      expect(result.text).toMatch(/## \[3:00\].*\n\n$/);
    });
  });
});
