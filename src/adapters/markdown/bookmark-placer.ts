import { Option } from "effect";
import type { LocatedLink } from "./link-parser.js";

export type EntryStyle = "list" | "heading" | "plain";

export interface PlacementResult {
  /** Line number to insert at */
  readonly line: number;
  /** Character offset on that line (usually 0) */
  readonly ch: number;
  /** The text to insert (includes formatting + trailing newline) */
  readonly text: string;
  /** Where to place cursor after insertion (line relative to insertion point) */
  readonly cursorLine: number;
  readonly cursorCh: number;
}

function detectStyle(line: string): EntryStyle {
  if (/^#{1,6}\s/.test(line)) return "heading";
  if (/^\s*[-*+]\s/.test(line)) return "list";
  return "plain";
}

function headingLevel(line: string): number {
  const match = line.match(/^(#{1,6})\s/);
  return match ? match[1]!.length : 0;
}

function listPrefix(line: string): string {
  const match = line.match(/^(\s*[-*+]\s)/);
  return match ? match[1]! : "- ";
}

function getTimestamp(link: LocatedLink): number {
  return Option.getOrElse(link.link.timestamp, () => 0);
}

/**
 * Determine where and how to insert a new timestamped bookmark.
 *
 * Algorithm:
 * 1. Linear search existing links for chronological position
 * 2. If a next entry exists: insert above it, matching its style
 * 3. If no next entry: insert after last entry, matching its style
 * 4. If no entries at all: insert at cursor
 */
export function computePlacement(
  content: string,
  existingLinks: ReadonlyArray<LocatedLink>,
  newTimestampSeconds: number,
  mdLink: string,
  cursorLine: number,
): PlacementResult {
  const lines = content.split("\n");

  if (existingLinks.length === 0) {
    return placePlain(mdLink, cursorLine, 0);
  }

  // Linear search: find first link with timestamp > newTimestampSeconds
  let nextIdx: number | undefined;
  for (let i = 0; i < existingLinks.length; i++) {
    if (getTimestamp(existingLinks[i]!) > newTimestampSeconds) {
      nextIdx = i;
      break;
    }
  }

  // Case: insert above the next entry
  if (nextIdx !== undefined) {
    const next = existingLinks[nextIdx]!;
    const nextLine = lines[next.line]!;
    const style = detectStyle(nextLine);
    return placeAbove(lines, next.line, style, nextLine, mdLink);
  }

  // Case: append after the last entry
  const last = existingLinks[existingLinks.length - 1]!;
  const lastLine = lines[last.line]!;
  const style = detectStyle(lastLine);
  return placeBelow(lines, last.line, style, lastLine, mdLink);
}

function placeAbove(
  lines: string[],
  targetLine: number,
  style: EntryStyle,
  refLine: string,
  mdLink: string,
): PlacementResult {
  switch (style) {
    case "heading": {
      const level = headingLevel(refLine);
      const prefix = "#".repeat(level) + " ";
      const text = `${prefix}${mdLink}\n\n`;
      return {
        line: targetLine,
        ch: 0,
        text,
        cursorLine: targetLine,
        cursorCh: prefix.length + mdLink.length,
      };
    }
    case "list": {
      const prefix = listPrefix(refLine);
      const text = `${prefix}${mdLink}\n`;
      return {
        line: targetLine,
        ch: 0,
        text,
        cursorLine: targetLine,
        cursorCh: prefix.length + mdLink.length,
      };
    }
    default: {
      const text = `${mdLink}\n`;
      return {
        line: targetLine,
        ch: 0,
        text,
        cursorLine: targetLine,
        cursorCh: mdLink.length,
      };
    }
  }
}

function placeBelow(
  lines: string[],
  lastEntryLine: number,
  style: EntryStyle,
  refLine: string,
  mdLink: string,
): PlacementResult {
  const insertLine = lastEntryLine + 1;

  switch (style) {
    case "heading": {
      const level = headingLevel(refLine);
      const prefix = "#".repeat(level) + " ";
      const text = `\n${prefix}${mdLink}\n\n`;
      return {
        line: insertLine,
        ch: 0,
        text,
        cursorLine: insertLine + 1,
        cursorCh: prefix.length + mdLink.length,
      };
    }
    case "list": {
      const prefix = listPrefix(refLine);
      const text = `${prefix}${mdLink}\n`;
      return {
        line: insertLine,
        ch: 0,
        text,
        cursorLine: insertLine,
        cursorCh: prefix.length + mdLink.length,
      };
    }
    default: {
      const text = `${mdLink}\n`;
      return {
        line: insertLine,
        ch: 0,
        text,
        cursorLine: insertLine,
        cursorCh: mdLink.length,
      };
    }
  }
}

function placePlain(
  mdLink: string,
  cursorLine: number,
  cursorCh: number,
): PlacementResult {
  const text = `${mdLink}\n`;
  return {
    line: cursorLine,
    ch: cursorCh,
    text,
    cursorLine,
    cursorCh: cursorCh + mdLink.length,
  };
}
