import { test } from "node:test";
import assert from "node:assert/strict";

import { check, Failure, Generators, type TestCase } from "./index.ts";

function failureFrom(body: () => void): Failure {
  try {
    body();
  } catch (error) {
    if (error instanceof Failure) return error;
    throw error;
  }
  assert.fail("expected a Failure");
}

test("a property that returns false is a failing property", () => {
  const failure = failureFrom(() => check(() => false, { examples: 1, seed: 1 }));
  assert.ok(failure.propertyCause instanceof Error);
  assert.equal(failure.propertyCause.message, "property returned false");
});

test("non-Error thrown values remain available on the failure", () => {
  const failure = failureFrom(() =>
    check((testCase) => {
      const value = testCase.draw(Generators.integers({ min: 0, max: 20_000 }));
      if (value >= 12_345) throw value;
    }, { examples: 300, seed: 1 })
  );
  assert.equal(failure.propertyCause, 12_345);
  assert.match(failure.message, /^12345\n/);
});

test("notes from the minimal counterexample appear in its failure", () => {
  const failure = failureFrom(() =>
    check((testCase) => {
      const value = testCase.draw(Generators.integers({ min: 0, max: 100 }));
      testCase.note(`value=${value}`);
      if (value >= 5) throw new Error("at least five");
    }, { examples: 200, seed: 1 })
  );
  assert.deepEqual(failure.notes, ["value=5"]);
  assert.match(failure.message, /Trace:\n- value=5/);
});

test("an explicit seed reproduces the same discovered failure", () => {
  const property = (testCase: TestCase): void => {
    const first = testCase.draw(Generators.integers({ min: 0, max: 100 }));
    const second = testCase.draw(Generators.integers({ min: 0, max: 100 }));
    if (first >= 5 && second >= 7) throw new Error("pair");
  };
  const first = failureFrom(() => check(property, { examples: 500, seed: 42 }));
  const second = failureFrom(() => check(property, { examples: 500, seed: 42 }));
  assert.equal(first.blob, second.blob);
});

test("invalid runner limits are rejected before generation", () => {
  assert.throws(() => check(() => {}, { examples: 0 }), /examples must be positive/);
  assert.throws(() => check(() => {}, { maxRejections: -1 }), /must be non-negative/);
  assert.throws(() => check(() => {}, { maxShrinks: -1 }), /must be non-negative/);
  assert.throws(() => check(() => {}, { maxStall: -1 }), /must be non-negative/);
});

test("async properties are rejected instead of silently passing", () => {
  assert.throws(
    () => check(async (testCase) => {
      testCase.draw(Generators.booleans());
    }),
    /requires a synchronous property/,
  );
  assert.throws(
    () => check((testCase) => Promise.resolve(testCase.draw(Generators.booleans()))),
    /requires a synchronous property/,
  );
});
