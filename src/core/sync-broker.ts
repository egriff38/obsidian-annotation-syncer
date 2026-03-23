import {
  Effect,
  Option,
  type Scope,
  Stream,
  SubscriptionRef,
} from "effect";
import type { TrackEntry, SyncError } from "./model.js";
import { SyncError as SyncErrorClass } from "./model.js";
import type { SyncState } from "./state.js";
import { SyncState as SyncStateEnum } from "./state.js";
import type { LeafAdapter } from "./leaf-adapter.js";
import type { SyncStrategy } from "./sync-strategy.js";

/**
 * The broker surface: generic over source and annotation location/region types.
 * Consumers interact with this without knowing which adapters are behind it.
 */
export interface SyncBroker<SL, SR, AL, AR> {
  readonly currentLocation: Stream.Stream<SL>;
  readonly activeRegion: Stream.Stream<Option.Option<SR | AR>>;
  readonly trackEntries: Stream.Stream<ReadonlyArray<TrackEntry<SL | AL>>>;
  readonly syncState: Stream.Stream<SyncState>;
  seekTo(location: SL): Effect.Effect<void, SyncError>;
  setSyncState(state: SyncState): Effect.Effect<void>;
  getCurrentTrack(): Effect.Effect<ReadonlyArray<TrackEntry<SL | AL>>>;
}

/**
 * Generic factory: given a source adapter, annotation adapter, and sync
 * strategy, produce a fully wired SyncBroker. No hardcoded adapter types.
 */
export function makeSyncBroker<SL, SR, AL, AR>(config: {
  source: LeafAdapter<SL, SR>;
  annotation: LeafAdapter<AL, AR>;
  strategy: SyncStrategy<SL, SR, AL, AR>;
}): Effect.Effect<SyncBroker<SL, SR, AL, AR>, never, Scope.Scope> {
  return Effect.gen(function* () {
    const { source, annotation, strategy } = config;

    const locationRef = yield* SubscriptionRef.make<SL>(
      undefined as unknown as SL,
    );
    const stateRef = yield* SubscriptionRef.make<SyncState>(
      SyncStateEnum.Idle(),
    );
    const trackRef = yield* SubscriptionRef.make<
      ReadonlyArray<TrackEntry<SL | AL>>
    >([]);
    const regionRef = yield* SubscriptionRef.make<Option.Option<SR | AR>>(
      Option.none(),
    );

    // Source location polling -> locationRef
    yield* source.locationChanges.pipe(
      Stream.tap((loc) => SubscriptionRef.set(locationRef, loc)),
      Stream.runDrain,
      Effect.forkScoped,
    );

    // Derivation: location + track -> activeRegion via strategy
    yield* Stream.zipLatest(
      SubscriptionRef.changes(locationRef),
      SubscriptionRef.changes(trackRef),
    ).pipe(
      Stream.mapEffect(([loc, track]) =>
        annotation.getContent.pipe(
          Effect.map((content) => strategy.deriveRegion(loc, track, content)),
          Effect.orElseSucceed(() => Option.none<SR | AR>()),
        ),
      ),
      Stream.tap((region) => SubscriptionRef.set(regionRef, region)),
      Stream.runDrain,
      Effect.forkScoped,
    );

    // Derivation: region changes -> SyncState transitions
    yield* SubscriptionRef.changes(regionRef).pipe(
      Stream.tap((region) =>
        Option.match(region, {
          onNone: () => SubscriptionRef.set(stateRef, SyncStateEnum.Idle()),
          onSome: (r) =>
            SubscriptionRef.set(
              stateRef,
              SyncStateEnum.Tracking({ currentRegion: r }),
            ),
        }),
      ),
      Stream.runDrain,
      Effect.forkScoped,
    );

    return {
      currentLocation: SubscriptionRef.changes(locationRef),
      activeRegion: SubscriptionRef.changes(regionRef),
      trackEntries: SubscriptionRef.changes(trackRef),
      syncState: SubscriptionRef.changes(stateRef),

      seekTo: (location: SL) =>
        source.seekTo(location).pipe(
          Effect.andThen(() => SubscriptionRef.set(locationRef, location)),
          Effect.mapError(
            (e) => new SyncErrorClass({ message: `seekTo: ${e}` }),
          ),
        ),

      setSyncState: (state) => SubscriptionRef.set(stateRef, state),

      getCurrentTrack: () => SubscriptionRef.get(trackRef),
    } satisfies SyncBroker<SL, SR, AL, AR>;
  });
}
