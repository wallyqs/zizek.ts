<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/zizek-ts-logo-dark.svg">
    <img src="docs/assets/zizek-ts-logo.svg" alt="Zizek.ts" width="320">
  </picture>
</p>

# Zizek for TypeScript

This package is the native TypeScript runtime for Zizek property testing,
based on [Hegel](https://hegel.dev) and
[Hypothesis](https://hypothesis.readthedocs.io/en/latest/) and keeping them
as oracle implementations. It explores generated examples, records every
choice, shrinks the first failure, and throws a `Failure` carrying a portable
reproduce blob.

Roughly three quarters of the core behavior is compiled from the Hegel engine
into `zizek_gen.ts`; the rest is a curated shell that aims to be idiomatic
TypeScript. [dev.md](dev.md) describes the split.

> ⚠️ **Status: experimental.** Behavior and the public API can still change and
> be tweaked between releases.

## Install

```bash
npm install --save-dev @less-than-nothing/zizek
```

The package is an ES module with type declarations and no runtime
dependencies. It needs Node 22.18 or newer.

## Quick start

A property is a function taking a test case. It passes by returning and fails
by throwing; `check` runs it and throws a shrunk `Failure` when it finds a
counterexample:

```ts
import { check, Failure, Generators, type TestCase } from "@less-than-nothing/zizek";

function property(testCase: TestCase): void {
  const value = testCase.draw(Generators.integers({ min: -100, max: 100 }));
  testCase.note(`value ${value}`);
  if (value >= 5) throw new Error(`value must be less than five: ${value}`);
}

try {
  check(property, { examples: 200, seed: 1 });
} catch (error) {
  if (!(error instanceof Failure)) throw error;
  console.log(error.message);

  // Runs exactly the recorded, shrunk example and throws the same Failure.
  check(property, { reproduce: error.blob });
}
```

The failure says which values failed, not just that something did:

```
value must be less than five: 5
reproduce with: check(property, { reproduce: "AAEAAAAACgEAAAAF" })

Trace:
- value 5
```

## Generators

Generators compose with `map`, `filter`, `oneOf`, `optional`, `record`, and
`composite`, and add no hidden choices, so a composed value shrinks and
replays like a plain one:

```ts
const requests = Generators.record({
  method: Generators.sampledFrom(["GET", "POST", "DELETE"]),
  resource: Generators.optional(Generators.text({ minSize: 1, maxSize: 8 })),
  retries: Generators.filter(Generators.integers({ min: 0, max: 10 }), (n) => n % 2 === 0),
});

check((testCase) => {
  const request = testCase.draw(requests);
  if (request.method === "DELETE" && request.resource === null) {
    throw new Error("DELETE must name a resource");
  }
}, { examples: 200, seed: 7 });
```

Integers are safe JavaScript `number`s by default; `Generators.bigIntegers()`
draws exact `bigint`s.

## Test runners

`check` is synchronous and reports by throwing, so it runs inside any test
runner as it is. With `node:test`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { check, Generators } from "@less-than-nothing/zizek";

test("the split is exact", () => {
  check((testCase) => {
    const total = testCase.draw(Generators.integers({ min: 0, max: 10_000 }));
    const people = testCase.draw(Generators.integers({ min: 1, max: 50 }));
    assert.equal(split(total, people).reduce((sum, share) => sum + share, 0), total);
  });
});
```

A `split` that drops the remainder fails the test with the assertion's
message, `0 !== 1`, followed by the reproduce line.

## Stateful testing

A state machine is an object with named rules and invariants; a failure
shrinks to the shortest sequence of steps that still fails:

```ts
import { check, Generators, Stateful } from "@less-than-nothing/zizek";

class Counter implements Stateful.Machine<Counter> {
  value = 0;

  readonly rules: readonly Stateful.Rule<Counter>[] = [
    {
      name: "increment",
      apply: (counter, testCase) => {
        counter.value += testCase.draw(Generators.integers({ min: 0, max: 10 }));
      },
    },
    {
      name: "decrement",
      apply: (counter, testCase) => {
        testCase.assume(counter.value > 0);
        counter.value -= 2;
      },
    },
  ];

  readonly invariants: readonly Stateful.Invariant<Counter>[] = [
    {
      name: "nonnegative",
      apply: (counter) => {
        if (counter.value < 0) throw new Error("counter went negative");
      },
    },
  ];
}

check((testCase) => Stateful.run(new Counter(), testCase), { examples: 500 });
```

## Learn more

- [GUIDE.md](GUIDE.md) walks through every feature with runnable examples:
  options and the failure types, the example database, keyed draws, coverage
  assertions, pools, and more.
- [`examples/`](examples) holds runnable examples; each is listed in the
  guide.
- [dev.md](dev.md) covers the core/shell split, the public API boundary, how
  the numeric semantics survive JavaScript, and verification.
- [CHANGELOG.md](CHANGELOG.md) records each release.

## Functionality available now

- Deterministically seeded sequential property exploration.
- Recorded exact integer, boolean, byte, IEEE-754 float, and Unicode text
  choices, with safe `number` and exact `bigint` integer facades.
- Uniform narrow and swarm-biased wide integers, plus options-object factories
  and immutable fluent builders for the integer, bigint, float, and text
  generators.
- Hegel-style TypeScript conveniences: `arrays`, `optional`, typed `record`,
  and single-codepoint `characters`.
- Assumption-based rejection with a configurable rejection limit.
- Variable-length `Generators.arrays` whose elements shrink by deletion
  (`lists` remains an alias), plus `Generators.sets`, `Generators.maps`, and
  `Generators.uniqueLists` for distinct elements.
- Bounded `Generators.recursive` trees, with subtree-aware shrinking.
- Per-choice shrinking plus element-span and rule-span deletion.
- Cloned streams: `testCase.cloneStream()` returns a child test case drawing
  from a stream of its own, framed in the parent's blob and shrunk by the same
  schedule.
- Portable failure blobs with exact replay, choice punning, forced-position
  accounting, and overrun detection. Punned draws are counted and reported on
  the failure.
- Keyed draws, shrink costs, and targeted generation.
- Coverage assertions and health checks.
- An example database that stores counterexamples between runs and replays
  them before generating — in a layout the Go, Python, and Ruby packages
  share.
- State machines with initial and post-rule invariants, rejected-rule
  handling, notes, and a default budget of 50 successful steps (rejected rules
  spend an attempt, not a step).
- Reusable and consumed generic pools addressed by generated stable
  identifiers.
- Ledger, queue, roundtrip, and tour examples that shrink to the same blobs as
  every other package.
