// Round-trip property example: run-length encoding.
//
// Demonstrates:
//   - the portable text generator (Generators.text);
//   - notes attached to the failing example (testCase.note);
//   - shrinking to a minimal counterexample; and
//   - replaying the portable reproduce blob.

import { check, Failure, Generators, type TestCase } from "../index.ts";

// The shrunk failure blob is identical in Go, Python, Ruby, and TypeScript.
export const PORTABLE_ROUNDTRIP_FAILURE = "AAEAAAAEAQAAADAAAAA=";

export type Run = [number, string];

// Compresses text into [count, char] runs. Deliberate bug: the run in progress
// is never flushed when the input ends, so the final run of every non-empty
// input is lost.
export function encode(text: string): Run[] {
  const runs: Run[] = [];
  let count = 0;
  let current = "";
  for (const char of text) {
    if (count > 0 && char === current) {
      count++;
      continue;
    }
    if (count > 0) runs.push([count, current]);
    current = char;
    count = 1;
  }
  return runs;
}

export function decode(runs: readonly Run[]): string {
  return runs.map(([count, char]) => char.repeat(count)).join("");
}

export function property(testCase: TestCase): void {
  const text = testCase.draw(Generators.text({ maxSize: 12 }));
  testCase.note(`text ${JSON.stringify(text)} encodes to ${JSON.stringify(encode(text))}`);
  const decoded = decode(encode(text));
  if (decoded === text) return;
  throw new Error(
    `round trip lost data: ${JSON.stringify(text)} became ${JSON.stringify(decoded)}`,
  );
}

export function findAndReplayBug(): Failure {
  let found: Failure;
  try {
    check(property, { examples: 200, seed: 1 });
    throw new Error("the round-trip bug should be discovered");
  } catch (error) {
    if (!(error instanceof Failure)) throw error;
    found = error;
  }

  // The blob is a portable description of the shrunk choices: replaying it runs
  // exactly the recorded example, here or in any other Zizek package.
  try {
    check(property, { reproduce: found.blob });
  } catch (error) {
    if (error instanceof Failure) return found;
    throw error;
  }
  throw new Error("the shrunk round-trip failure must replay");
}

if (process.argv[1] === import.meta.filename) console.log(findAndReplayBug().message);
