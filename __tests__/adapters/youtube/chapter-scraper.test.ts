import { describe, expect, it } from "vitest";
import { ChapterData } from "../../../src/adapters/youtube/model.js";
import {
  parseChaptersFromDescription,
  snapToChapter,
} from "../../../src/adapters/youtube/chapter-scraper.js";

describe("parseChaptersFromDescription", () => {
  it("parses multiple chapters", () => {
    const desc = `0:00 Intro
1:23 First Topic
5:00 Second Topic
1:02:30 Final Thoughts`;
    const chapters = parseChaptersFromDescription(desc);
    expect(chapters).toHaveLength(4);
    expect(chapters[0]!.title).toBe("Intro");
    expect(chapters[0]!.startSeconds).toBe(0);
    expect(chapters[1]!.title).toBe("First Topic");
    expect(chapters[1]!.startSeconds).toBe(83);
    expect(chapters[2]!.startSeconds).toBe(300);
    expect(chapters[3]!.title).toBe("Final Thoughts");
    expect(chapters[3]!.startSeconds).toBe(3750);
  });

  it("skips non-timestamp lines", () => {
    const desc = `Check out my channel!
0:00 Intro
Some random text
1:23 Content`;
    const chapters = parseChaptersFromDescription(desc);
    expect(chapters).toHaveLength(2);
  });

  it("returns empty for no chapters", () => {
    expect(parseChaptersFromDescription("No chapters here")).toHaveLength(0);
    expect(parseChaptersFromDescription("")).toHaveLength(0);
  });
});

describe("snapToChapter", () => {
  const chapters = [
    new ChapterData({ title: "Intro", startSeconds: 0 }),
    new ChapterData({ title: "Topic 1", startSeconds: 60 }),
    new ChapterData({ title: "Topic 2", startSeconds: 180 }),
  ];

  it("snaps when within default threshold (2s)", () => {
    expect(snapToChapter(1, chapters)).toBe(0);
    expect(snapToChapter(61, chapters)).toBe(60);
    expect(snapToChapter(179, chapters)).toBe(180);
  });

  it("does not snap outside threshold", () => {
    expect(snapToChapter(5, chapters)).toBe(5);
    expect(snapToChapter(90, chapters)).toBe(90);
  });

  it("respects custom threshold", () => {
    expect(snapToChapter(5, chapters, 5)).toBe(0);
    expect(snapToChapter(5, chapters, 4)).toBe(5);
    expect(snapToChapter(5, chapters, 3)).toBe(5);
  });

  it("handles empty chapters", () => {
    expect(snapToChapter(42, [])).toBe(42);
  });

  it("snaps to first matching chapter", () => {
    const close = [
      new ChapterData({ title: "A", startSeconds: 10 }),
      new ChapterData({ title: "B", startSeconds: 11 }),
    ];
    expect(snapToChapter(10, close)).toBe(10);
  });
});
