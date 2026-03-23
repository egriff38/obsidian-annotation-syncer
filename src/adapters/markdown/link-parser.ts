import { Option, Schema } from "effect";
import type { LinkData } from "../../core/model.js";
import { YouTubeLinkUrl } from "../youtube/youtube-link-url.js";

const decodeUrl = Schema.decodeOption(YouTubeLinkUrl);

export interface LocatedLink {
  readonly link: LinkData;
  readonly line: number;
  readonly ch: number;
  readonly label: string;
  readonly fullMatch: string;
}

/**
 * Parse timestamped YouTube links from markdown content,
 * returning each link with its line number and position.
 */
export function parseLocatedLinks(
  markdown: string,
): ReadonlyArray<LocatedLink> {
  const results: Array<LocatedLink> = [];
  const lines = markdown.split("\n");
  const linkRegex =
    /\[([^\]]*)\]\((https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^\s)]*|youtu\.be\/[^\s)]*)[^)]*)\)/g;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]!;
    linkRegex.lastIndex = 0;
    let match;
    while ((match = linkRegex.exec(line)) !== null) {
      const url = match[2]!;
      const decoded = decodeUrl(url);
      if (Option.isSome(decoded)) {
        results.push({
          link: decoded.value,
          line: lineIdx,
          ch: match.index,
          label: match[1]!,
          fullMatch: match[0],
        });
      }
    }
  }
  return results;
}

/** Parse timestamped YouTube links from markdown content (flat, no position info) */
export function parseTimestampedLinks(
  markdown: string,
): ReadonlyArray<LinkData> {
  return parseLocatedLinks(markdown).map((l) => l.link);
}
