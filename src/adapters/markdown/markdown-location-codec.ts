import { Option, Order } from "effect";
import type { LocationCodec } from "../../core/location-codec.js";
import { MarkdownPosition, LineRange } from "./model.js";

export const markdownLocationCodec: LocationCodec<MarkdownPosition, LineRange> =
  {
    encode(location) {
      return `L${location.line}:${location.ch}`;
    },

    decode(raw) {
      const match = raw.match(/^L(\d+):(\d+)$/);
      if (!match) return Option.none();
      return Option.some(
        new MarkdownPosition({ line: Number(match[1]), ch: Number(match[2]) }),
      );
    },

    contains(region, location) {
      if (
        location.line < region.fromLine ||
        location.line > region.toLine
      )
        return false;
      if (
        location.line === region.fromLine &&
        location.ch < region.fromCh
      )
        return false;
      if (location.line === region.toLine && location.ch > region.toCh)
        return false;
      return true;
    },

    regionFrom(start, end?) {
      const to = end ?? start;
      return Option.some(
        new LineRange({
          fromLine: start.line,
          fromCh: start.ch,
          toLine: to.line,
          toCh: to.ch,
        }),
      );
    },

    compare(a, b) {
      const lineCmp = Order.Number(a.line, b.line);
      if (lineCmp !== 0) return lineCmp;
      return Order.Number(a.ch, b.ch);
    },
  };
