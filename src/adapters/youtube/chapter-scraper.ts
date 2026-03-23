import { ChapterData } from "./model.js";

/** Parse "0:00 Title\n1:23 Title" from a description string */
export function parseChaptersFromDescription(
  description: string,
): ReadonlyArray<ChapterData> {
  const lines = description.split("\n");
  const chapters: Array<ChapterData> = [];
  for (const line of lines) {
    const match = line.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.+)$/);
    if (!match) continue;
    const [, h, m, s, title] = match;
    const seconds = s
      ? Number(h) * 3600 + Number(m) * 60 + Number(s)
      : Number(h) * 60 + Number(m);
    chapters.push(new ChapterData({ title: title!, startSeconds: seconds }));
  }
  return chapters;
}

/** Snap a timestamp to the nearest chapter boundary if within threshold */
export function snapToChapter(
  seconds: number,
  chapters: ReadonlyArray<ChapterData>,
  threshold: number = 2,
): number {
  for (const ch of chapters) {
    if (Math.abs(ch.startSeconds - seconds) <= threshold) {
      return ch.startSeconds;
    }
  }
  return seconds;
}
