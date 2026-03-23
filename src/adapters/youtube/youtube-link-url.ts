import { Effect, Option, Schema, SchemaIssue, SchemaTransformation } from "effect";
import { LinkData } from "../../core/model.js";
import { parseYouTubeUrl } from "./url-parser.js";

/**
 * Schema codec: `string` (YouTube URL) ↔ `LinkData`.
 *
 * Decode: parses a raw YouTube URL into a `LinkData` with videoId-based
 *         canonical URL, timestamp, and endTimestamp.
 * Encode: rebuilds the canonical URL string from LinkData fields.
 */
export const YouTubeLinkUrl = Schema.String.pipe(
  Schema.decodeTo(
    LinkData,
    SchemaTransformation.transformOrFail({
      decode: (raw) => {
        const parsed = parseYouTubeUrl(raw);
        if (Option.isNone(parsed)) {
          return Effect.fail(
            new SchemaIssue.InvalidValue(Option.some(raw), {
              message: `Not a valid YouTube URL: ${raw}`,
            }),
          );
        }
        const { videoId, timestamp, endTimestamp } = parsed.value;
        return Effect.succeed({
          url: `https://youtube.com/watch?v=${videoId}`,
          timestamp: Option.getOrNull(timestamp),
          endTimestamp: Option.getOrNull(endTimestamp),
        });
      },
      encode: (encoded) => {
        const base = encoded.url;
        const parts: string[] = [];
        if (encoded.timestamp != null) {
          parts.push(`t=${encoded.timestamp}`);
        }
        if (encoded.endTimestamp != null) {
          parts.push(`end=${encoded.endTimestamp}`);
        }
        const sep = base.includes("?") ? "&" : "?";
        return Effect.succeed(
          parts.length > 0 ? `${base}${sep}${parts.join("&")}` : base,
        );
      },
    }),
  ),
);
