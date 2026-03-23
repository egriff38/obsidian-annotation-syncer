import { Effect, Option, Ref } from "effect";

export interface BookmarkletAction {
  readonly timestamp: number;
  readonly linkFrom: { line: number; ch: number };
  readonly linkTo: { line: number; ch: number };
}

export interface ChordDetector {
  recordAction(action: BookmarkletAction): Effect.Effect<void>;
  invalidate(): Effect.Effect<void>;
  detectChord(now: number, timeout?: number): Effect.Effect<Option.Option<BookmarkletAction>>;
}

/**
 * State machine for detecting the "bookmarklet end" double-press chord.
 * - `recordAction` saves the most recent bookmarklet.
 * - `invalidate` clears it (called on editor-change).
 * - `detectChord` returns the saved action if within timeout, then clears it.
 */
export function createChordDetector(): Effect.Effect<ChordDetector> {
  return Effect.gen(function* () {
    const lastAction = yield* Ref.make<Option.Option<BookmarkletAction>>(
      Option.none(),
    );

    return {
      recordAction: (action) => Ref.set(lastAction, Option.some(action)),

      invalidate: () => Ref.set(lastAction, Option.none()),

      detectChord: (now, timeout = 3000) =>
        Effect.gen(function* () {
          const prev = yield* Ref.get(lastAction);
          return Option.flatMap(prev, (a) => {
            if (now - a.timestamp <= timeout) {
              return Option.some(a);
            }
            return Option.none();
          });
        }).pipe(
          Effect.tap(() => Ref.set(lastAction, Option.none())),
        ),
    };
  });
}
