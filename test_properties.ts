import { test } from "node:test";
import assert from "node:assert/strict";

import { check, Generators } from "./index.ts";

const RUN = { examples: 100, seed: 20260818n } as const;

function frequencies(values: readonly number[]): [number, number][] {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
}

test("list sorting is idempotent and preserves elements", () => {
  check((testCase) => {
    const values = testCase.draw(
      Generators.lists(Generators.integers({ min: -100, max: 100 }), { maxSize: 12 }),
    );
    const sorted = [...values].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
    const sortedTwice = [...sorted].sort(
      (left, right) => left < right ? -1 : left > right ? 1 : 0,
    );
    assert.deepEqual(sortedTwice, sorted);
    assert.deepEqual(frequencies(sorted), frequencies(values));
  }, RUN);
});

test("list reversal is an involution and concatenation is associative", () => {
  check((testCase) => {
    const generator = Generators.lists(Generators.booleans(), { maxSize: 8 });
    const first = testCase.draw(generator);
    const second = testCase.draw(generator);
    const third = testCase.draw(generator);
    assert.deepEqual([...first].reverse().reverse(), first);
    assert.deepEqual(first.concat(second).concat(third), first.concat(second.concat(third)));
  }, RUN);
});

test("bounded integer arithmetic obeys commutativity and associativity", () => {
  check((testCase) => {
    const generator = Generators.integers({ min: -1_000, max: 1_000 });
    const first = testCase.draw(generator);
    const second = testCase.draw(generator);
    const third = testCase.draw(generator);
    assert.equal(first + second, second + first);
    assert.equal(first + (second + third), (first + second) + third);
    assert.equal(first * second, second * first);
  }, RUN);
});

test("finite floats are bracketed by floor and ceil", () => {
  check((testCase) => {
    const value = testCase.draw(Generators.floats({ min: -1e6, max: 1e6 }));
    assert.ok(Math.floor(value) <= value);
    assert.ok(Math.ceil(value) >= value);
  }, RUN);
});

test("ASCII string operations preserve their standard laws", () => {
  check((testCase) => {
    const value = testCase.draw(
      Generators.text({ maxSize: 20, alphabet: "abc xyzABCXYZ09" }),
    );
    assert.equal(value.toUpperCase().toUpperCase(), value.toUpperCase());
    assert.equal(value.split("|").join("|"), value);
    assert.ok(value.includes("a") === (value.indexOf("a") !== -1));
  }, RUN);
});

test("set union and intersection satisfy the cardinality identity", () => {
  check((testCase) => {
    const generator = Generators.sets(
      Generators.integers({ min: 0, max: 20 }),
      { maxSize: 10 },
    );
    const first = testCase.draw(generator);
    const second = testCase.draw(generator);
    const union = new Set([...first, ...second]);
    const intersection = new Set([...first].filter((value) => second.has(value)));
    assert.equal(union.size + intersection.size, first.size + second.size);
  }, RUN);
});

test("generated maps return every stored value by its key", () => {
  check((testCase) => {
    const values = testCase.draw(
      Generators.maps(
        Generators.text({ minSize: 1, maxSize: 5, alphabet: "abcxyz" }),
        Generators.integers({ min: -100, max: 100 }),
        { maxSize: 8 },
      ),
    );
    for (const [key, value] of values) assert.equal(values.get(key), value);
  }, RUN);
});

test("JSON-compatible generated scalars round trip", () => {
  const valueGenerator = Generators.oneOf<unknown>(
    Generators.integers({ min: -1_000, max: 1_000 }),
    Generators.text({ maxSize: 20, alphabet: "abc xyzABCXYZ09" }),
    Generators.booleans(),
  );
  check((testCase) => {
    const value = testCase.draw(valueGenerator);
    assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
  }, RUN);
});
