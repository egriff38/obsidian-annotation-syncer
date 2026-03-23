import { type Option, type Ordering } from "effect";
import type { Tagged } from "./model.js";

export interface LocationCodec<L extends Tagged, R extends Tagged> {
  encode(location: L): string;
  decode(raw: string): Option.Option<L>;
  contains(region: R, location: L): boolean;
  regionFrom(start: L, end?: L): Option.Option<R>;
  compare(a: L, b: L): Ordering.Ordering;
}
