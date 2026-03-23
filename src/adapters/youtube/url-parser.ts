import { Option } from "effect";

export interface ParsedYouTubeUrl {
  readonly videoId: string;
  readonly timestamp: Option.Option<number>;
  readonly endTimestamp: Option.Option<number>;
}

/**
 * Parse a YouTube URL into its constituent parts.
 * Handles youtube.com/watch?v=, youtu.be/, and custom &end= param.
 */
export function parseYouTubeUrl(url: string): Option.Option<ParsedYouTubeUrl> {
  let videoId: string | undefined;
  let urlObj: URL;

  try {
    urlObj = new URL(url);
  } catch {
    return Option.none();
  }

  if (
    urlObj.hostname === "www.youtube.com" ||
    urlObj.hostname === "youtube.com" ||
    urlObj.hostname === "m.youtube.com"
  ) {
    videoId = urlObj.searchParams.get("v") ?? undefined;
  } else if (urlObj.hostname === "youtu.be") {
    videoId = urlObj.pathname.slice(1) || undefined;
  }

  if (!videoId) return Option.none();

  const tParam = urlObj.searchParams.get("t");
  const timestamp = tParam
    ? Option.some(parseTimeParam(tParam))
    : Option.none();

  const endParam = urlObj.searchParams.get("end");
  const endTimestamp = endParam
    ? Option.some(parseTimeParam(endParam))
    : Option.none();

  return Option.some({ videoId, timestamp, endTimestamp });
}

/** Parse a time parameter like "90", "90s", "1m30s", "1h2m3s" */
function parseTimeParam(raw: string): number {
  const hms = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!hms) return Number(raw) || 0;
  const h = Number(hms[1] || 0);
  const m = Number(hms[2] || 0);
  const s = Number(hms[3] || 0);
  return h * 3600 + m * 60 + s;
}

/** Format seconds as a human-readable timestamp string */
export function formatTimestamp(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Parse a timestamp string like "1:23" or "1:02:33" into seconds */
export function parseTimestamp(str: string): Option.Option<number> {
  const parts = str.split(":").map(Number);
  if (parts.some(Number.isNaN)) return Option.none();
  if (parts.length === 3)
    return Option.some(parts[0]! * 3600 + parts[1]! * 60 + parts[2]!);
  if (parts.length === 2)
    return Option.some(parts[0]! * 60 + parts[1]!);
  return Option.none();
}
