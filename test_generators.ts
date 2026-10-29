import { test } from "node:test";
import assert from "node:assert/strict";

import { check, Failure, type Generator, Generators } from "./index.ts";

type Generated<Source> = Source extends Generator<infer Value> ? Value : never;

function exercise<T>(generator: Generator<T>, verify: (value: T) => void, examples = 40): void {
  check((testCase) => verify(testCase.draw(generator)), { examples, seed: 20260817n });
}

function failureFrom(run: () => void): Failure {
  try {
    run();
  } catch (error) {
    if (error instanceof Failure) return error;
    throw error;
  }
  throw new Error("expected property failure");
}

test("integers return safe numbers and fluent builders are immutable", () => {
  const base = Generators.integers();
  const negative = base.minValue(-100).maxValue(-1);

  assert.equal(base.minimum, Number.MIN_SAFE_INTEGER);
  assert.equal(base.maximum, Number.MAX_SAFE_INTEGER);
  assert.equal(negative.minimum, -100);
  assert.equal(negative.maximum, -1);
  exercise(negative, (value) => {
    assert.equal(typeof value, "number");
    assert.ok(Number.isSafeInteger(value));
    assert.ok(value >= -100 && value <= -1);
  });
});

test("bigIntegers preserve exact bigint values and immutable builders", () => {
  const base = Generators.bigIntegers();
  const negative = base.minValue(-100n).maxValue(-1n);

  assert.equal(base.minimum, -(1n << 63n));
  assert.equal(base.maximum, (1n << 63n) - 1n);
  assert.equal(negative.minimum, -100n);
  assert.equal(negative.maximum, -1n);
  exercise(negative, (value) => {
    assert.equal(typeof value, "bigint");
    assert.ok(value >= -100n && value <= -1n);
  });
});

test("number and bigint integer facades preserve the same bounded blob", () => {
  const numberFailure = failureFrom(() => check((testCase) => {
    if (testCase.draw(Generators.integers({ min: 0, max: 100 })) >= 5) {
      throw new Error("too large");
    }
  }, { examples: 200, seed: 42 }));
  const bigintFailure = failureFrom(() => check((testCase) => {
    if (testCase.draw(Generators.bigIntegers({ min: 0n, max: 100n })) >= 5n) {
      throw new Error("too large");
    }
  }, { examples: 200, seed: 42 }));

  assert.equal(numberFailure.blob, bigintFailure.blob);
});

test("floats stay within their configured finite range", () => {
  exercise(Generators.floats({ min: -1.5, max: 2.5 }), (value) => {
    assert.equal(typeof value, "number");
    assert.ok(Number.isFinite(value));
    assert.ok(value >= -1.5 && value <= 2.5);
  });
});

test("text respects codepoint length and an explicit alphabet", () => {
  exercise(
    Generators.text({ minSize: 2, maxSize: 6, alphabet: "abc" }),
    (value) => {
      assert.ok([...value].length >= 2 && [...value].length <= 6);
      assert.match(value, /^[abc]+$/u);
    },
  );
});

test("characters produce one codepoint from their alphabet", () => {
  exercise(Generators.characters({ alphabet: "abc" }), (value) => {
    assert.equal([...value].length, 1);
    assert.match(value, /^[abc]$/u);
  });
});

test("binary produces Uint8Array values within its size bounds", () => {
  exercise(Generators.binary({ minSize: 2, maxSize: 8 }), (value) => {
    assert.ok(value instanceof Uint8Array);
    assert.ok(value.length >= 2 && value.length <= 8);
  });
});

test("booleans, just, and none preserve their native values", () => {
  exercise(Generators.booleans(), (value) => assert.equal(typeof value, "boolean"));

  const object = { kind: "constant" };
  exercise(Generators.just(object), (value) => assert.equal(value, object), 3);
  exercise(Generators.none(), (value) => assert.equal(value, null), 3);
});

test("sampledFrom returns original values and rejects an empty catalogue", () => {
  const values = [{ id: 1 }, { id: 2 }, { id: 3 }] as const;
  exercise(Generators.sampledFrom(values), (value) => assert.ok(values.includes(value)));
  assert.throws(() => Generators.sampledFrom([]), /at least one value/);
});

test("oneOf draws from a branch and rejects an empty branch list", () => {
  const choices = Generators.oneOf<number | string>(
    Generators.integers({ min: 0, max: 10 }),
    Generators.text({ minSize: 1, maxSize: 3, alphabet: "xy" }),
  );
  exercise(choices, (value) => {
    if (typeof value === "number") {
      assert.ok(value >= 0 && value <= 10);
    } else {
      assert.match(value, /^[xy]{1,3}$/u);
    }
  });
  assert.throws(() => Generators.oneOf(), /at least one generator/);
});

test("lists support bounds, nesting, mapping, and filtering", () => {
  const even = Generators.map(
    Generators.filter(Generators.integers({ min: 0, max: 20 }), (value) => value % 2 === 0),
    (value) => value * 2,
  );
  const nested = Generators.lists(
    Generators.lists(even, { minSize: 1, maxSize: 3 }),
    { minSize: 2, maxSize: 4 },
  );
  exercise(nested, (outer) => {
    assert.ok(outer.length >= 2 && outer.length <= 4);
    for (const inner of outer) {
      assert.ok(inner.length >= 1 && inner.length <= 3);
      assert.ok(inner.every((value) => value >= 0 && value <= 40 && value % 4 === 0));
    }
  });
});

test("arrays are behaviorally identical to lists", () => {
  const listFailure = failureFrom(() => check((testCase) => {
    if (testCase.draw(Generators.lists(Generators.booleans())).length >= 2) {
      throw new Error("too long");
    }
  }, { examples: 200, seed: 17 }));
  const arrayFailure = failureFrom(() => check((testCase) => {
    if (testCase.draw(Generators.arrays(Generators.booleans())).length >= 2) {
      throw new Error("too long");
    }
  }, { examples: 200, seed: 17 }));

  assert.equal(arrayFailure.blob, listFailure.blob);
});

test("unique lists can distinguish elements by a derived key", () => {
  const entries = Generators.map(
    Generators.integers({ min: 0, max: 100 }),
    (value) => ({ value, key: value % 10 }),
  );
  exercise(
    Generators.uniqueLists(entries, {
      minSize: 2,
      maxSize: 6,
      uniqueBy: (entry) => entry.key,
    }),
    (values) => {
      assert.ok(values.length >= 2 && values.length <= 6);
      assert.equal(new Set(values.map((value) => value.key)).size, values.length);
    },
  );
});

test("sets contain distinct bounded values and respect size bounds", () => {
  exercise(
    Generators.sets(Generators.integers({ min: 0, max: 100 }), { minSize: 2, maxSize: 5 }),
    (values) => {
      assert.ok(values instanceof Set);
      assert.ok(values.size >= 2 && values.size <= 5);
      assert.ok([...values].every((value) => value >= 0 && value <= 100));
    },
  );
});

test("maps keep keys distinct while independently generating values", () => {
  exercise(
    Generators.maps(
      Generators.integers({ min: 0, max: 100 }),
      Generators.booleans(),
      { minSize: 2, maxSize: 5 },
    ),
    (values) => {
      assert.ok(values instanceof Map);
      assert.ok(values.size >= 2 && values.size <= 5);
      assert.ok([...values.keys()].every((value) => value >= 0 && value <= 100));
      assert.ok([...values.values()].every((value) => typeof value === "boolean"));
    },
  );
});

test("composite generators can make later draws depend on earlier ones", () => {
  const orderedPair = Generators.composite((draw) => {
    const low = draw(Generators.integers({ min: 0, max: 10 }));
    const high = draw(Generators.integers({ min: low, max: 10 }));
    return [low, high] as const;
  });
  exercise(orderedPair, ([low, high]) => assert.ok(low <= high));
});

test("optional shrinks towards null and preserves the inner type", () => {
  const generator = Generators.optional(Generators.integers({ min: 1, max: 10 }));
  const optionalType: number | null = undefined as unknown as Generated<typeof generator>;
  void optionalType;

  const failure = failureFrom(() => check((testCase) => {
    if (testCase.draw(generator) !== null) throw new Error("present");
  }, { examples: 100, seed: 9 }));
  const replayed: Array<number | null> = [];
  failureFrom(() => check((testCase) => {
    const value = testCase.draw(generator);
    replayed.push(value);
    if (value !== null) throw new Error("present");
  }, { reproduce: failure.blob }));
  assert.deepEqual(replayed, [1]);
});

test("record infers and draws plain object fields in order", () => {
  const generator = Generators.record({
    name: Generators.characters({ alphabet: "xy" }),
    age: Generators.integers({ min: 0, max: 120 }),
    active: Generators.booleans(),
  });
  const recordType: { name: string; age: number; active: boolean } =
    undefined as unknown as Generated<typeof generator>;
  void recordType;

  exercise(generator, (value) => {
    assert.match(value.name, /^[xy]$/u);
    assert.ok(value.age >= 0 && value.age <= 120);
    assert.equal(typeof value.active, "boolean");
    assert.deepEqual(Object.keys(value), ["name", "age", "active"]);
  });
});

test("generator factories reject invalid bounds before a run starts", () => {
  assert.throws(
    () => Generators.integers({ min: 5, max: 3 }),
    /minimum must be <= maximum/,
  );
  assert.throws(
    () => Generators.integers({ max: Number.MAX_SAFE_INTEGER + 1 }),
    /maximum must be a safe integer/,
  );
  assert.throws(
    () => Generators.integers({ shrinkTowards: 0.5 }),
    /shrink target must be a safe integer/,
  );
  assert.throws(
    () => Generators.bigIntegers({ min: 5n, max: 3n }),
    /minimum must be <= maximum/,
  );
  assert.throws(
    () => Generators.bigIntegers({ min: 0n, max: 1n << 64n }),
    /at most 2\^64 values/,
  );
  assert.throws(
    () => Generators.floats({ min: 5, max: 3 }),
    /invalid float bounds/,
  );
  assert.throws(
    () => Generators.text({ minSize: 5, maxSize: 3 }),
    /minimum <= maximum/,
  );
  assert.throws(
    () => Generators.binary({ minSize: -1 }),
    /non-negative safe integers/,
  );
  assert.throws(
    () => Generators.lists(Generators.booleans(), { minSize: 5, maxSize: 3 }),
    /minimum <= maximum/,
  );
  assert.throws(
    () => Generators.uniqueLists(Generators.booleans(), { minSize: -1 }),
    /non-negative safe integers/,
  );
  assert.throws(
    () => Generators.sets(Generators.booleans(), { minSize: 5, maxSize: 3 }),
    /minimum <= maximum/,
  );
  assert.throws(
    () => Generators.maps(Generators.booleans(), Generators.booleans(), {
      minSize: 5,
      maxSize: 3,
    }),
    /minimum <= maximum/,
  );
});

test("equal bounds produce fixed-size or fixed-value draws", () => {
  check((testCase) => {
    assert.equal(testCase.draw(Generators.integers({ min: 3, max: 3 })), 3);
    assert.equal(testCase.draw(Generators.bigIntegers({ min: 3n, max: 3n })), 3n);
    assert.equal([...testCase.draw(Generators.text({ minSize: 2, maxSize: 2 }))].length, 2);
    assert.equal(testCase.draw(Generators.binary({ minSize: 2, maxSize: 2 })).length, 2);
    assert.equal(
      testCase.draw(Generators.lists(Generators.booleans(), { minSize: 2, maxSize: 2 })).length,
      2,
    );
  }, { examples: 10, seed: 20260818n });
});

test("tuples preserve per-position and nested types", () => {
  const pairGenerator = Generators.tuples(
    Generators.integers({ min: 0, max: 10 }),
    Generators.booleans(),
  );
  const pairType: [number, boolean] = undefined as unknown as Generated<typeof pairGenerator>;
  const pairReverse: Generated<typeof pairGenerator> = [1, true];
  void pairType;
  void pairReverse;

  const nestedGenerator = Generators.tuples(
    pairGenerator,
    Generators.text({ maxSize: 3 }),
    Generators.floats({ min: 0, max: 1 }),
  );
  const nestedType: [[number, boolean], string, number] =
    undefined as unknown as Generated<typeof nestedGenerator>;
  void nestedType;

  const mapped = Generators.map(pairGenerator, ([value, flag]) => ({ value, flag }));
  const mappedType: { value: number; flag: boolean } =
    undefined as unknown as Generated<typeof mapped>;
  void mappedType;

  exercise(nestedGenerator, ([[value, flag], text, float]) => {
    assert.equal(typeof value, "number");
    assert.equal(typeof flag, "boolean");
    assert.equal(typeof text, "string");
    assert.equal(typeof float, "number");
  }, 10);
});
