import { describe, expect, it } from "vitest";
import { Effect, Option, Stream } from "effect";
import type { LeafAdapter } from "../../src/core/leaf-adapter.js";
import type { SyncStrategy } from "../../src/core/sync-strategy.js";
import { makeSyncBroker } from "../../src/core/sync-broker.js";
import { SyncState } from "../../src/core/state.js";

interface TestLoc {
  readonly _tag: "TestLoc";
  readonly value: number;
}
interface TestRegion {
  readonly _tag: "TestRegion";
  readonly start: number;
  readonly end: number;
}

const loc = (value: number): TestLoc => ({ _tag: "TestLoc", value });

function mockAdapter(
  locations: TestLoc[],
): LeafAdapter<TestLoc, TestRegion> {
  let seeked: TestLoc | null = null;
  return {
    getLocation: Effect.succeed(
      locations.length > 0 ? Option.some(locations[0]!) : Option.none(),
    ),
    seekTo: (l) =>
      Effect.sync(() => {
        seeked = l;
      }),
    getContent: Effect.succeed("mock content"),
    getMetadata: Effect.succeed({}),
    locationChanges: Stream.fromIterable(locations),
    dispose: Effect.void,
  };
}

const testStrategy: SyncStrategy<TestLoc, TestRegion, TestLoc, TestRegion> = {
  deriveRegion: (sourceLoc, _track, _content) => {
    if (sourceLoc.value > 0) {
      return Option.some({
        _tag: "TestRegion" as const,
        start: sourceLoc.value,
        end: sourceLoc.value + 10,
      });
    }
    return Option.none();
  },
  buildTrack: (source, annotation) => [...source, ...annotation],
  translateLocation: () => Option.none(),
};

describe("SyncBroker", () => {
  it("creates a broker via makeSyncBroker", async () => {
    const source = mockAdapter([loc(10), loc(20)]);
    const annotation = mockAdapter([]);

    const program = Effect.scoped(
      Effect.gen(function* () {
        const broker = yield* makeSyncBroker({
          source,
          annotation,
          strategy: testStrategy,
        });
        const track = yield* broker.getCurrentTrack();
        expect(track).toEqual([]);
      }),
    );

    await Effect.runPromise(program);
  });

  it("seekTo delegates to source and updates location", async () => {
    const source = mockAdapter([loc(10)]);
    const annotation = mockAdapter([]);

    const program = Effect.scoped(
      Effect.gen(function* () {
        const broker = yield* makeSyncBroker({
          source,
          annotation,
          strategy: testStrategy,
        });
        yield* broker.seekTo(loc(42));
      }),
    );

    await Effect.runPromise(program);
  });

  it("setSyncState transitions the state", async () => {
    const source = mockAdapter([loc(10)]);
    const annotation = mockAdapter([]);

    const program = Effect.scoped(
      Effect.gen(function* () {
        const broker = yield* makeSyncBroker({
          source,
          annotation,
          strategy: testStrategy,
        });
        yield* broker.setSyncState(SyncState.Editing());
      }),
    );

    await Effect.runPromise(program);
  });
});
