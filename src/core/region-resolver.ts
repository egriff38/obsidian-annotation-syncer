import type { Option } from "effect";

export interface RegionResolver<L, R> {
  resolveRegion(
    location: L,
    documentContent: string,
    allTimestampedLocations: ReadonlyArray<L>,
  ): Option.Option<R>;
}
