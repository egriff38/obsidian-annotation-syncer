import { Option, Order } from "effect";
import type { LocationCodec } from "../../core/location-codec.js";
import { YouTubeTimestamp, TimeRange } from "./model.js";

export const youtubeLocationCodec: LocationCodec<YouTubeTimestamp, TimeRange> = {
  encode(location) {
    const s = Math.floor(location.seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  },

  decode(raw) {
    if (!raw) return Option.none();
    const parts = raw.split(":").map(Number);
    if (parts.some((p) => Number.isNaN(p))) return Option.none();
    let seconds: number;
    if (parts.length === 3) {
      seconds = parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
    } else if (parts.length === 2) {
      seconds = parts[0]! * 60 + parts[1]!;
    } else if (parts.length === 1) {
      seconds = parts[0]!;
    } else {
      return Option.none();
    }
    return Option.some(new YouTubeTimestamp({ seconds }));
  },

  contains(region, location) {
    if (location.seconds < region.start) return false;
    return Option.match(region.end, {
      onNone: () => true,
      onSome: (end) => location.seconds <= end,
    });
  },

  regionFrom(start, end?) {
    return Option.some(
      new TimeRange({
        start: start.seconds,
        end: end ? Option.some(end.seconds) : Option.none(),
      }),
    );
  },

  compare(a, b) {
    return Order.Number(a.seconds, b.seconds);
  },
};
