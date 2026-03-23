import { describe, expect, it } from "vitest";
import { Effect, Option } from "effect";
import { createChordDetector } from "../../src/obsidian/chord-detector.js";
import type { BookmarkletAction } from "../../src/obsidian/chord-detector.js";

const action: BookmarkletAction = {
  timestamp: 1000,
  linkFrom: { line: 0, ch: 0 },
  linkTo: { line: 0, ch: 20 },
};

describe("ChordDetector", () => {
  it("detects chord within timeout", async () => {
    const program = Effect.gen(function* () {
      const detector = yield* createChordDetector();
      yield* detector.recordAction(action);
      const result = yield* detector.detectChord(2000, 3000);
      expect(Option.isSome(result)).toBe(true);
    });
    await Effect.runPromise(program);
  });

  it("returns None when outside timeout", async () => {
    const program = Effect.gen(function* () {
      const detector = yield* createChordDetector();
      yield* detector.recordAction(action);
      const result = yield* detector.detectChord(5000, 3000);
      expect(Option.isNone(result)).toBe(true);
    });
    await Effect.runPromise(program);
  });

  it("returns None when no previous action", async () => {
    const program = Effect.gen(function* () {
      const detector = yield* createChordDetector();
      const result = yield* detector.detectChord(1000);
      expect(Option.isNone(result)).toBe(true);
    });
    await Effect.runPromise(program);
  });

  it("clears after detection", async () => {
    const program = Effect.gen(function* () {
      const detector = yield* createChordDetector();
      yield* detector.recordAction(action);
      yield* detector.detectChord(2000);
      const result = yield* detector.detectChord(2000);
      expect(Option.isNone(result)).toBe(true);
    });
    await Effect.runPromise(program);
  });

  it("invalidates on edit", async () => {
    const program = Effect.gen(function* () {
      const detector = yield* createChordDetector();
      yield* detector.recordAction(action);
      yield* detector.invalidate();
      const result = yield* detector.detectChord(1500);
      expect(Option.isNone(result)).toBe(true);
    });
    await Effect.runPromise(program);
  });

  it("handles rapid fire - second recordAction overwrites first", async () => {
    const program = Effect.gen(function* () {
      const detector = yield* createChordDetector();
      yield* detector.recordAction(action);
      const action2: BookmarkletAction = {
        timestamp: 2000,
        linkFrom: { line: 1, ch: 0 },
        linkTo: { line: 1, ch: 20 },
      };
      yield* detector.recordAction(action2);
      const result = yield* detector.detectChord(3000);
      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result).timestamp).toBe(2000);
    });
    await Effect.runPromise(program);
  });
});
