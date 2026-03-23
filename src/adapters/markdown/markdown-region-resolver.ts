import { Option } from "effect";
import type { RegionResolver } from "../../core/region-resolver.js";
import { MarkdownPosition, LineRange } from "./model.js";

/**
 * Resolve a highlight region in markdown given a cursor position.
 * Rules:
 * - Header line → header + all content until next header of same or higher level
 * - Paragraph → from current line to next blank line or timestamp link
 * - List item → the list item line
 */
export const markdownRegionResolver: RegionResolver<
  MarkdownPosition,
  LineRange
> = {
  resolveRegion(location, documentContent, allTimestampedLocations) {
    const lines = documentContent.split("\n");
    const lineIdx = location.line;

    if (lineIdx < 0 || lineIdx >= lines.length) return Option.none();

    const currentLine = lines[lineIdx]!;

    // Find the set of lines that have timestamps, sorted
    const timestampLines = allTimestampedLocations
      .map((l) => l.line)
      .sort((a, b) => a - b);

    // Header: extends to next header of same/higher level or next timestamp
    const headerMatch = currentLine.match(/^(#{1,6})\s/);
    if (headerMatch) {
      const level = headerMatch[1]!.length;
      let endLine = lineIdx;
      for (let i = lineIdx + 1; i < lines.length; i++) {
        const hm = lines[i]!.match(/^(#{1,6})\s/);
        if (hm && hm[1]!.length <= level) break;
        // Stop at next timestamped location
        if (timestampLines.includes(i) && i !== lineIdx) break;
        endLine = i;
      }
      return Option.some(
        new LineRange({
          fromLine: lineIdx,
          fromCh: 0,
          toLine: endLine,
          toCh: lines[endLine]!.length,
        }),
      );
    }

    // Paragraph: extends to next blank line or next timestamp line
    let endLine = lineIdx;
    for (let i = lineIdx + 1; i < lines.length; i++) {
      if (lines[i]!.trim() === "") break;
      if (timestampLines.includes(i)) break;
      endLine = i;
    }

    return Option.some(
      new LineRange({
        fromLine: lineIdx,
        fromCh: 0,
        toLine: endLine,
        toCh: lines[endLine]!.length,
      }),
    );
  },
};
