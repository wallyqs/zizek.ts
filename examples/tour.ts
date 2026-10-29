// A tour of Zizek's draw and configuration surface, one scenario per feature:
//
//   1. bounded integers with a custom shrink target;
//   2. assumptions that reject examples instead of failing them;
//   3. boolean and byte draws shrinking together;
//   4. bounded IEEE-754 floats with portable shrinking; and
//   5. rejection limits (TooManyRejections).
//
// Every scenario is deterministic: it uses a fixed seed and prints the shrunk
// failure it expects to find.

import { check, Failure, Generators, type Property, TooManyRejections } from "../index.ts";

function expectFailure(property: Property, options: Parameters<typeof check>[1], what: string): Failure {
  try {
    check(property, options);
  } catch (error) {
    if (error instanceof Failure) return error;
    throw error;
  }
  throw new Error(what);
}

// shrinkTowards: failures shrink to the failing value closest to the requested
// target instead of the interval minimum.
export function shrinkTargets(): Failure {
  return expectFailure((testCase) => {
    const value = testCase.draw(Generators.integers({ min: -1000, max: 1000, shrinkTowards: 500 }));
    testCase.note(`value ${value}`);
    if (value > 700) throw new Error(`value ${value} exceeds the budget of 700`);
  }, { examples: 300, seed: 1 }, "expected a failure above 700");
}

// assume: odd draws are rejected (not failed), so the shrunk counterexample is
// the smallest *even* value above the limit.
export function evenNumbersOnly(): Failure {
  return expectFailure((testCase) => {
    const value = testCase.integer(0, 100);
    testCase.assume(value % 2n === 0n);
    testCase.note(`even value ${value}`);
    if (value > 50n) throw new Error(`even value ${value} exceeds 50`);
  }, { examples: 300, seed: 1 }, "expected an even failure above 50");
}

// Low-level boolean and bytes draws shrinking together: the boolean stays true
// because false passes, and the payload shrinks to the single smallest high
// byte.
export function flagsAndBytes(): Failure {
  return expectFailure((testCase) => {
    const compressed = testCase.boolean();
    const payload = testCase.bytes(1, 4);
    const hex = [...payload].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    testCase.note(`compressed=${compressed} payload=${hex}`);
    if (!compressed) return;
    for (const value of payload) {
      if (value >= 0x80) {
        throw new Error(
          `compressed payload contains high byte 0x${value.toString(16).padStart(2, "0")}`,
        );
      }
    }
  }, { examples: 300, seed: 1 }, "expected a high-byte failure");
}

// Float generation, replay, and shrink ordering use the compiled float choice.
// The smallest value outside [0, 1) is exactly 1.0.
export function boundedFloats(): Failure {
  return expectFailure((testCase) => {
    const value = testCase.draw(Generators.floats({ min: 0, max: 10 }));
    testCase.note(`value ${value}`);
    if (value >= 1) throw new Error(`float ${value} is outside [0, 1)`);
  }, { examples: 300, seed: 1 }, "expected a float failure");
}

// maxRejections: a property whose assumptions reject every example stops with
// TooManyRejections instead of searching forever.
export function rejectionLimit(): TooManyRejections {
  try {
    check((testCase) => {
      const value = testCase.integer(0, 1000);
      testCase.assume(value > 1000n); // impossible: every example is rejected
    }, { examples: 10, maxRejections: 20, seed: 1 });
  } catch (error) {
    if (error instanceof TooManyRejections) return error;
    throw error;
  }
  throw new Error("expected TooManyRejections");
}

if (process.argv[1] === import.meta.filename) {
  console.log("== 1. integers with a shrink target ==");
  console.log(shrinkTargets().message);
  console.log("\n== 2. assumptions ==");
  console.log(evenNumbersOnly().message);
  console.log("\n== 3. booleans and bytes ==");
  console.log(flagsAndBytes().message);
  console.log("\n== 4. bounded floats ==");
  console.log(boundedFloats().message);
  console.log("\n== 5. rejection limits ==");
  console.log(rejectionLimit().message);
}
