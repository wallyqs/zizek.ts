import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  check,
  Generators,
  databaseDigest,
  DirectoryDatabase,
  FailedCoverage,
  FailedHealthCheck,
  Failure,
  InvalidReplay,
  InMemoryDatabase,
  ReplayOverrun,
  keyHash,
  Stateful,
  TestCase,
  TooManyRejections,
} from "./index.ts";
// White-box tests reach past the public entry point for the internals they
// inspect; index.ts deliberately does not export these.
import {
  asciiBytes,
  candidateDraws,
  type Draw,
  drawsSimpler,
  MAX_CLONE_DEPTH,
  Rng,
  serializedDraws,
  signedBytes,
} from "./shell.ts";
import * as Core from "./zizek_gen.ts";
import * as Ledger from "./examples/ledger.ts";
import * as Queue from "./examples/queue.ts";
import * as Roundtrip from "./examples/roundtrip.ts";
import * as Tour from "./examples/tour.ts";
import { traceDraw } from "./drawops_gen_test.ts";
import { runDeclaredDatabaseCase } from "./databasecases_gen_test.ts";
import { runDeclaredShellCase } from "./shellcases_gen_test.ts";

const CROSS_LANGUAGE_INTEGER_FIVE = "AAEAAAAACgEAAAAF";
// An explicit shrinkTowards above max must clamp to max, not to min. Go and Zig
// used to fold this together with the "no target given" default and clamped to
// min instead.
const CROSS_LANGUAGE_CLAMPED_TARGET = "AAEAAAAACgEAAAAK";
const CROSS_LANGUAGE_FLOAT_ONE = "AAEAAAACAAAAAAAA8D8=";

function expectFailure(body: () => void): Failure {
  try {
    body();
  } catch (error) {
    if (error instanceof Failure) return error;
    throw error;
  }
  assert.fail("expected a Failure");
}

// A run that produced no valid examples at all. Which of the two run-level
// errors surfaces depends on which limit is reached first, and neither is a
// property failure.
function expectRejectedRun(body: () => void): void {
  try {
    body();
  } catch (error) {
    if (error instanceof TooManyRejections || error instanceof FailedHealthCheck) return;
    throw error;
  }
  assert.fail("expected a rejection outcome");
}

function expectThrown<T>(kind: new (...args: never[]) => T, body: () => void): T {
  try {
    body();
  } catch (error) {
    if (error instanceof kind) return error;
    throw error;
  }
  assert.fail(`expected ${kind.name}`);
}

test("floats shrink and replay portably", () => {
  const seen: number[] = [];
  const property = (testCase: TestCase): void => {
    const value = testCase.draw(Generators.floats({ min: 0, max: 10 }));
    seen.push(value);
    if (value >= 1) throw new Error("float must be less than one");
  };
  const failure = expectFailure(() => check(property, { examples: 300, seed: 1 }));
  assert.equal(failure.blob, CROSS_LANGUAGE_FLOAT_ONE);
  seen.length = 0;
  expectFailure(() => check(property, { reproduce: failure.blob }));
  assert.deepEqual(seen, [1]);
});

// Runs a passing property drawing perCase floats from generator in each of
// examples cases, and returns every value drawn.
function collectFloats(
  generator: ReturnType<typeof Generators.floats>,
  perCase: number,
  examples: number,
): number[] {
  const drawn: number[] = [];
  check((testCase: TestCase): void => {
    for (let i = 0; i < perCase; i++) drawn.push(testCase.draw(generator));
  }, { examples, seed: 1 });
  return drawn;
}

// Raw bit patterns essentially never land in a narrow range, so the old draw
// fell back to the bounds: floats(1000, 1001) produced only the two endpoints.
// The default draw now interpolates across the range half the time.
test("bounded floats reach the interior", () => {
  const narrow = collectFloats(Generators.floats({ min: 1000, max: 1001 }), 1, 300);
  assert.ok(narrow.every((value) => value >= 1000 && value <= 1001));
  const distinct = new Set(narrow).size;
  assert.ok(distinct > 100, `${distinct} distinct values`);

  const unit = collectFloats(Generators.floats({ min: 0, max: 1 }), 10, 600);
  const share = unit.filter((value) => value >= 0.25 && value <= 0.75).length / unit.length;
  assert.ok(share >= 0.2, `${(share * 100).toFixed(1)}% of ${unit.length} draws interior`);
});

test("unbounded floats still reach special values", () => {
  const drawn = collectFloats(
    Generators.floats({ allowNan: true, allowInfinity: true }),
    4,
    500,
  );
  for (const special of [NaN, Infinity, -Infinity, 0, -0]) {
    assert.ok(drawn.some((value) => Object.is(value, special)), `never drew ${special}`);
  }

  const finite = collectFloats(Generators.floats(), 4, 500);
  assert.ok(finite.every((value) => Number.isFinite(value)));
  assert.ok(finite.includes(0), "finite floats never drew zero");
});

test("failure shrinks and replays", () => {
  const seen: bigint[] = [];
  const property = (testCase: TestCase): void => {
    const value = testCase.integer(-100, 100);
    seen.push(value);
    if (value >= 5n) throw new Error("too large");
  };

  const failure = expectFailure(() => check(property, { examples: 200, seed: 1 }));
  seen.length = 0;
  expectFailure(() => check(property, { reproduce: failure.blob }));
  assert.deepEqual(seen, [5n]);
});

class BugA extends Error {}

// A run that discovers one bug must not report a counterexample for another one
// it stumbled into while shrinking.
test("shrinking stays on the bug that was found", () => {
  for (let seed = 1; seed <= 3; seed++) {
    let found: string | null = null;
    const property = (testCase: TestCase): void => {
      const value = testCase.integer(0, 100);
      if (value > 50n) {
        found ??= "A";
        throw new BugA("bug A");
      }
      if (value === 7n) {
        found ??= "B";
        throw new Error("bug B");
      }
    };
    try {
      check(property, { examples: 50, seed });
    } catch (error) {
      if (!(error instanceof Failure)) throw error;
      if (found === "A") assert.ok(error.propertyCause instanceof BugA);
    }
  }
});

test("boolean and bytes draws round trip", () => {
  const property = (testCase: TestCase): void => {
    const enabled = testCase.boolean();
    const payload = testCase.bytes(0, 4);
    if (enabled && payload.length > 0) throw new Error("enabled payload");
  };
  const failure = expectFailure(() => check(property, { examples: 200, seed: 7 }));
  expectFailure(() => check(property, { reproduce: failure.blob }));
});

test("cross-language blob fixture", () => {
  const seen: bigint[] = [];
  expectFailure(() =>
    check((testCase) => {
      seen.push(testCase.integer(-100, 100));
      throw new Error("always fails");
    }, { reproduce: CROSS_LANGUAGE_INTEGER_FIVE })
  );
  assert.deepEqual(seen, [5n]);
});

test("assumptions do not count as examples", () => {
  let attempts = 0;
  check((testCase) => {
    attempts++;
    testCase.assume(attempts % 2 === 0);
  }, { examples: 3, seed: 11 });
  assert.equal(attempts, 6);
});

test("simplest probe uses choice simplest values", () => {
  const seen: Array<[bigint, boolean, Uint8Array, number]> = [];
  check((testCase) => {
    seen.push([
      testCase.integer(5, 10, 7),
      testCase.boolean(),
      testCase.bytes(2, 4),
      testCase.float(1, 2),
    ]);
  }, { examples: 1 });
  assert.deepEqual(seen, [[7n, false, new Uint8Array([0, 0]), 1]]);
});

test("large-base-example health check and suppression", () => {
  const property = (testCase: TestCase): void => {
    for (let i = 0; i < 4097; i++) testCase.boolean();
  };
  const health = expectThrown(
    FailedHealthCheck,
    () => check(property, { examples: 1 }),
  );
  assert.equal(health.check, "large_base_example");
  check(property, { examples: 1, suppressLargeBaseExample: true });
});

test("too-slow health check and suppression", () => {
  const property = (testCase: TestCase): void => {
    (testCase as unknown as { generationMicros: bigint }).generationMicros = 1_000_001n;
  };
  const health = expectThrown(
    FailedHealthCheck,
    () => check(property, { examples: 1 }),
  );
  assert.equal(health.check, "too_slow");
  check(property, { examples: 1, suppressTooSlow: true });
});

test("too many rejections", () => {
  const failure = expectThrown(
    TooManyRejections,
    () => check((testCase) => testCase.assume(false), { examples: 1, maxRejections: 2 }),
  );
  assert.equal(failure.rejections, 3);
  assert.equal(failure.limit, 2);
});

test("filter-too-much health check and suppression", () => {
  const property = (testCase: TestCase): void => testCase.assume(false);
  const health = expectThrown(
    FailedHealthCheck,
    () => check(property, { examples: 1, suppressLargeBaseExample: true }),
  );
  assert.equal(health.check, "filter_too_much");

  const rejected = expectThrown(
    TooManyRejections,
    () => check(property, {
      examples: 1,
      maxRejections: 50,
      suppressFilterTooMuch: true,
    }),
  );
  assert.equal(rejected.rejections, 51);
});

test("data-too-large health check and suppression", () => {
  let attempts = 0;
  const property = (testCase: TestCase): void => {
    attempts++;
    if (attempts <= 20) {
      for (let i = 0; i < 8193; i++) testCase.boolean();
    }
  };
  const health = expectThrown(
    FailedHealthCheck,
    () => check(property, { examples: 1, suppressLargeBaseExample: true }),
  );
  assert.equal(health.check, "data_too_large");

  attempts = 0;
  check(property, {
    examples: 1,
    suppressDataTooLarge: true,
    suppressLargeBaseExample: true,
  });
  assert.equal(attempts, 21);
});

test("valid examples expand the rejection budget", () => {
  let attempts = 0;
  check((testCase) => {
    attempts++;
    testCase.assume(attempts % 101 === 0);
  }, { examples: 15, seed: 11, suppressFilterTooMuch: true });
  assert.equal(attempts, 1515);
});

test("rejected shrink candidate is not a failure", () => {
  const failure = expectFailure(() =>
    check((testCase) => {
      const value = testCase.integer(0, 100);
      testCase.assume(value >= 5n);
      throw new Error("accepted value fails");
    }, { examples: 100, seed: 3 })
  );
  const replayed: bigint[] = [];
  expectFailure(() =>
    check((testCase) => {
      const value = testCase.integer(0, 100);
      replayed.push(value);
      testCase.assume(value >= 5n);
      throw new Error("accepted value fails");
    }, { reproduce: failure.blob })
  );
  assert.deepEqual(replayed, [5n]);
});

test("replay puns across choice kinds", () => {
  const seen: boolean[] = [];
  expectFailure(() =>
    check((testCase) => {
      seen.push(testCase.boolean());
      throw new Error("always fails");
    }, { reproduce: CROSS_LANGUAGE_INTEGER_FIVE })
  );
  assert.deepEqual(seen, [true]);
});

test("a forced draw skips a replay position", () => {
  const raw = serializedDraws([
    {
      kind: "integer",
      encoded: Core.serializeIntegerChoice(signedBytes(5n)),
      value: 5n,
      params: [5n, 5n, 5n],
      forced: false,
      key: null,
    },
    {
      kind: "integer",
      encoded: Core.serializeIntegerChoice(signedBytes(7n)),
      value: 7n,
      params: [7n, 7n, 7n],
      forced: false,
      key: null,
    },
  ]);
  const blob = Core.rawFailureEncode(raw);
  const seen: bigint[] = [];
  expectFailure(() =>
    check((testCase) => {
      seen.push(testCase.forcedInteger(99));
      seen.push(testCase.integer(0, 10));
      throw new Error("always fails");
    }, { reproduce: blob })
  );
  assert.deepEqual(seen, [99n, 7n]);
});

test("replay overrun is not a failure", () => {
  expectThrown(ReplayOverrun, () =>
    check((testCase) => {
      testCase.integer(0, 10);
      testCase.integer(0, 10);
      throw new Error("unreachable");
    }, { reproduce: CROSS_LANGUAGE_INTEGER_FIVE }));
});

test("nested choice spans", () => {
  const captured: TestCase[] = [];
  check((testCase) => {
    assert.equal(testCase.startSpan("outer"), 0);
    testCase.integer(0, 10);
    assert.equal(testCase.startSpan("inner"), 1);
    testCase.boolean();
    testCase.stopSpan(true);
    testCase.bytes(0, 2);
    testCase.stopSpan();
    captured.push(testCase);
  }, { examples: 1, seed: 17 });
  assert.deepEqual(
    captured[0].spans.map((span) =>
      [span.start, span.finish, span.label, span.depth, span.parent, span.discarded]
    ),
    [
      [0, 3, "outer", 0, null, false],
      [1, 2, "inner", 1, 0, true],
    ],
  );
});

test("a list shrinks by deleting elements", () => {
  const element = Generators.bigIntegers({ min: 0n, max: 1000n });
  const failure = expectFailure(() =>
    check((testCase) => {
      const values = testCase.draw(Generators.lists(element));
      let total = 0n;
      for (const value of values) total += value;
      if (total >= 50n) throw new Error("sum too large");
    }, { examples: 200, seed: 7 })
  );
  const seen: bigint[][] = [];
  expectFailure(() =>
    check((testCase) => {
      seen.push(testCase.draw(Generators.lists(element)));
      throw new Error("replay");
    }, { reproduce: failure.blob })
  );
  // Not merely "shorter": the one element left is the smallest that fails.
  assert.deepEqual(seen, [[50n]]);
});

test("a list deletes an element from the middle", () => {
  const element = Generators.bigIntegers({ min: 0n, max: 10n });
  const failure = expectFailure(() =>
    check((testCase) => {
      const values = testCase.draw(Generators.lists(element));
      if (values.includes(3n)) throw new Error("found three");
    }, { examples: 500, seed: 3 })
  );
  const seen: bigint[][] = [];
  expectFailure(() =>
    check((testCase) => {
      seen.push(testCase.draw(Generators.lists(element)));
      throw new Error("replay");
    }, { reproduce: failure.blob })
  );
  // Every element around the interesting one has to be deletable, not only
  // the trailing ones a truncating shrinker can drop.
  assert.deepEqual(seen, [[3n]]);
});

test("a bounded list respects its size bounds", () => {
  const element = Generators.bigIntegers({ min: 0n, max: 10n });
  const lengths = new Set<number>();
  check((testCase) => {
    lengths.add(
      testCase.draw(Generators.lists(element, { minSize: 2, maxSize: 4 })).length,
    );
  }, { examples: 200, seed: 5 });
  for (const length of lengths) assert.ok(length >= 2 && length <= 4, `length ${length}`);
  assert.ok(lengths.size > 1, "bounded list never varied its length");
});

test("a fixed-size list draws no length choice", () => {
  const element = Generators.bigIntegers({ min: 0n, max: 10n });
  const captured: TestCase[] = [];
  check((testCase) => {
    testCase.draw(Generators.lists(element, { minSize: 2, maxSize: 2 }));
    captured.push(testCase);
  }, { examples: 1, seed: 1 });
  // Coinciding bounds decide nothing, so the stream holds the two elements
  // and no "another element?" booleans at all.
  assert.deepEqual(captured[0].draws.map((draw) => draw.kind), ["integer", "integer"]);
});

test("list elements are recorded as spans", () => {
  const element = Generators.bigIntegers({ min: 0n, max: 3n });
  const captured: TestCase[] = [];
  check((testCase) => {
    testCase.collect(element, 2, 2);
    captured.push(testCase);
  }, { examples: 1, seed: 1 });
  // One span per element plus the empty span of the iteration that stopped;
  // each element span is exactly the range deletion removes.
  assert.deepEqual(
    captured[0].spans.map((span) => [span.start, span.finish, span.discarded]),
    [[0, 1, false], [1, 2, false], [2, 2, true]],
  );
});

test("set elements are always distinct", () => {
  const element = Generators.bigIntegers({ min: 0n, max: 6n });
  let longest = 0;
  check((testCase) => {
    const values = testCase.draw(Generators.sets(element, { maxSize: 6 }));
    longest = Math.max(longest, values.size);
  }, { examples: 300, seed: 3n });
  // A Set drops repeats silently, so what proves the element loop kept asking
  // after a duplicate is that sets grew past one element at all.
  assert.ok(longest > 1, `set never grew past ${longest} elements`);
});

test("duplicate candidates are discarded, not kept", () => {
  // Two distinct values in the range and three requested elements, so the third
  // element is guaranteed to burn its candidates and reject.
  const element = Generators.bigIntegers({ min: 0n, max: 1n });
  const captured: TestCase[] = [];
  check((testCase) => {
    testCase.collectUnique<bigint, bigint>(element, null, 0, 3);
    captured.push(testCase);
  }, { examples: 1, seed: 1n });
  assert.ok(
    captured[0].spans.some((span) => span.discarded && span.finish > span.start),
    "a duplicate candidate left no discarded span behind",
  );
});

test("unsatisfiable uniqueness rejects rather than hanging", () => {
  // Four distinct values cannot come out of a two-value range.
  const element = Generators.bigIntegers({ min: 0n, max: 1n });
  expectRejectedRun(() =>
    check((testCase) => {
      testCase.draw(Generators.sets(element, { minSize: 4 }));
      throw new Error("unreachable");
    }, { examples: 50, seed: 1n })
  );
});

test("the reject action matches the generated rule", () => {
  // The three actions, read straight off the compiled decision so the shell's
  // branch names cannot drift from what they dispatch on.
  assert.equal(Core.manyRejectAction(1n, 0n, 0n), 0n);
  assert.equal(Core.manyRejectAction(4n, 0n, 0n), 1n);
  assert.equal(Core.manyRejectAction(4n, 0n, 1n), 2n);
  assert.equal(Core.manyRejectAction(4n, 2n, 0n), 0n);
  assert.equal(Core.manyRejectionBudget(0n), 3n);
});

test("map keys are distinct and values are free", () => {
  const keys = Generators.bigIntegers({ min: 0n, max: 3n });
  const values = Generators.bigIntegers({ min: 0n, max: 1n });
  let grew = false;
  let repeated = false;
  check((testCase) => {
    const mapping = testCase.draw(Generators.maps(keys, values, { maxSize: 4 }));
    if (mapping.size > 1) {
      grew = true;
      if (new Set(mapping.values()).size < mapping.size) repeated = true;
    }
  }, { examples: 200, seed: 4n });
  assert.ok(grew, "map never held more than one entry");
  // Values repeat freely — uniqueness is judged on the key alone.
  assert.ok(repeated, "no map ever repeated a value, so the key predicate is too wide");
});

test("an open span closes on failure", () => {
  const captured: TestCase[] = [];
  expectFailure(() =>
    check((testCase) => {
      testCase.startSpan("open");
      testCase.boolean();
      captured.push(testCase);
      throw new Error("boom");
    }, { examples: 1, seed: 1 })
  );
  const spans = captured[0].spans;
  assert.equal(spans.length, 1);
  assert.equal(spans[0].finish, 1);
});

test("a forced choice has no shrink candidates", () => {
  const draw: Draw = {
    kind: "integer",
    encoded: new Uint8Array(),
    value: 99n,
    params: [99n, 99n, 99n],
    forced: true,
    key: null,
  };
  assert.deepEqual(candidateDraws(draw), []);
});

test("sort key is choice-count-first shortlex", () => {
  const booleanDraw = (value: boolean, forced = false): Draw => ({
    kind: "boolean",
    key: null,
    encoded: Core.serializeBooleanChoice(value),
    value,
    params: [],
    forced,
  });
  const falseDraw = booleanDraw(false);
  const trueDraw = booleanDraw(true);
  assert.equal(drawsSimpler([trueDraw], [falseDraw, falseDraw]), true);
  assert.equal(drawsSimpler([falseDraw, trueDraw], [trueDraw, falseDraw]), true);
  assert.equal(drawsSimpler([trueDraw, falseDraw], [falseDraw, trueDraw]), false);
  assert.equal(drawsSimpler([booleanDraw(false, true)], [booleanDraw(true, true)]), true);
  const bytesDraw = (size: number): Draw => {
    const value = new Uint8Array(size);
    return {
      kind: "bytes",
      encoded: Core.serializeBytesChoice(value),
      value,
      params: [0n, 16n],
      forced: false,
      key: null,
    };
  };
  assert.equal(drawsSimpler([bytesDraw(8)], [bytesDraw(9)]), true);
  assert.equal(drawsSimpler([bytesDraw(9)], [bytesDraw(8)]), false);
});

test("biased integer draws find a boundary", () => {
  expectFailure(() =>
    check((testCase) => {
      if (testCase.integer(0, 1_000_000) === 1n) throw new Error("found one");
    }, { examples: 5_000, seed: 23 })
  );
});

test("pools draw reusable and consumed values", () => {
  check((testCase) => {
    const values = Stateful.pool<string>(testCase);
    values.add(testCase, "old");
    values.add(testCase, "new");
    assert.ok(["old", "new"].includes(testCase.draw(values.valuesReusable())));
    assert.ok(["old", "new"].includes(testCase.draw(values.valuesConsumed())));
    assert.equal(values.length, 1);
  }, { examples: 20, seed: 11 });
});

// Adding to a pool draws a recorded identifier, and every reference replays
// onto the same value it named when recorded. Adding used to consume no choice
// at all and a reference used to be a reverse index into the live list, so the
// pool's whole identity scheme lived in host state the blob never saw. Both
// halves are now in the stream (`hegel-c` 0.32.4), which is what this pins: the
// identifier draws are real entries, and replaying the blob resolves the same
// variables rather than whatever now sits at those positions.
test("pool add records an identifier that replays", () => {
  const drawn: string[][] = [];
  const property = (testCase: TestCase): void => {
    const values = Stateful.pool<string>(testCase);
    for (const name of ["a", "b", "c"]) values.add(testCase, name);
    drawn.push([
      testCase.draw(values.valuesReusable()),
      testCase.draw(values.valuesReusable()),
    ]);
    throw new Error("always fails");
  };

  const failure = expectFailure(() => check(property, { examples: 1, seed: 5 }));
  const recorded = drawn[drawn.length - 1];
  // Three adds and two references: five recorded entries where the old encoding
  // recorded only the two references.
  const stream = Core.rawFailureDecode(asciiBytes(failure.blob));
  assert.notEqual(stream, null);
  assert.equal(Core.choiceStreamCount(stream!), 5n);

  drawn.length = 0;
  expectFailure(() => check(property, { reproduce: failure.blob }));
  assert.deepEqual(drawn[drawn.length - 1], recorded);
});

// The minimal failure of ThirdA under the continue protocol, and the same
// failure as the stop protocol recorded it before the decision was inverted.
const STATEFUL_THIRD_A_FAILURE = "AXichYgxCgAACIR0Dfr/dyOC1nNRbEApWU5+mM8ADpIAZA==";
const STATEFUL_THIRD_A_STOP_PROTOCOL = "AXiclcaxDQAACMMwd0Xi/3dh4QCGKG6E2tzywQAOIgBh";
// ThirdA's failure behind one integer drawn before the machine starts.
const STATEFUL_DRAW_BEFORE_THIRD_A_FAILURE = "AXicfYmxDQAACMLs6uD/56qJTiQwEGgrJsk23PgvwpAGEhwAcA==";

// One rule that draws one integer: the smallest machine a step count can make
// large.
class Pusher implements Stateful.Machine<Pusher> {
  readonly pushed: bigint[] = [];
  readonly rules: readonly Stateful.Rule<Pusher>[] = [
    { name: "push", apply: (machine, testCase) => machine.pushed.push(testCase.integer(0, 10)) },
  ];
  readonly invariants: readonly Stateful.Invariant<Pusher>[] = [];
}

// Rule "a" fails on its third run. Both rules draw an integer first, which is
// what made the legacy stream read back as protocol 2.
class ThirdA implements Stateful.Machine<ThirdA> {
  readonly seen: string[] = [];
  readonly rules: readonly Stateful.Rule<ThirdA>[] = ["a", "b"].map((name) => ({
    name,
    apply: (machine: ThirdA, testCase: TestCase) => {
      testCase.integer(0, 10);
      machine.seen.push(name);
      if (machine.seen.filter((seen) => seen === "a").length >= 3) {
        throw new Error("a ran three times");
      }
    },
  }));
  readonly invariants: readonly Stateful.Invariant<ThirdA>[] = [];
}

// The rules a ThirdA blob runs, asserting that it fails.
function replayThirdA(blob: string): string[] {
  let machine = new ThirdA();
  expectFailure(() =>
    check((testCase) => {
      machine = new ThirdA();
      Stateful.run(machine, testCase);
    }, { reproduce: blob })
  );
  return machine.seen;
}

function statefulProtocolOf(blob: string): bigint {
  const stream = Core.rawFailureDecode(asciiBytes(blob));
  assert.notEqual(stream, null);
  return Core.statefulChoiceProtocol(stream!, 4n, Core.choiceStreamCount(stream!));
}

// The per-step continue decision (`hegel-c` 0.36.1). The next three tests run
// with the same constants in every shell's test file, because the shared
// shell-case table has no way to describe a machine.

// The simplest value of a continue decision stops. Under the old stop decision
// the all-simplest probe ran every one of its steps, so a one-rule machine at
// 5000 steps overran the choice budget and failed the large_base_example
// health check (upstream #433). With one example the probe is the only case
// the run executes.
test("the simplest probe runs one step under a large step count", () => {
  const counts: number[] = [];
  check((testCase) => {
    const machine = new Pusher();
    Stateful.run(machine, testCase, 5000n);
    counts.push(machine.pushed.length);
  }, { examples: 1, seed: 1 });
  assert.deepEqual(counts, [1]);
});

// A failure the simplest probe cannot reach shrinks and replays. The probe used
// to record the legacy protocol, which the sniffer reads back as protocol 2
// once a rule draws an integer first, so this run failed with "shrunk example
// no longer fails". Every shell converges on the same three-step stream, so the
// blob is pinned.
test("a third-run failure shrinks to three steps and replays", () => {
  const failure = expectFailure(() =>
    check((testCase) => Stateful.run(new ThirdA(), testCase), { examples: 100, seed: 1 })
  );
  assert.equal(statefulProtocolOf(failure.blob), 3n);
  assert.equal(failure.blob, STATEFUL_THIRD_A_FAILURE);
  assert.deepEqual(replayThirdA(failure.blob), ["a", "a", "a"]);
});

// A draw before the machine starts is not read as the machine's own. The
// protocol sniffer used to read the head of the stream, so the leading integer
// made a continue-protocol stream look like a stop-protocol one: the replay
// inverted every decision and stopped after one step, the shrinker reported the
// failure as flaky, and the blob it printed did not reproduce.
test("a draw before the machine shrinks and replays", () => {
  let machine = new ThirdA();
  const property = (testCase: TestCase) => {
    testCase.integer(0, 10);
    machine = new ThirdA();
    Stateful.run(machine, testCase);
  };
  const failure = expectFailure(() => check(property, { examples: 100, seed: 1 }));
  assert.equal(failure.blob, STATEFUL_DRAW_BEFORE_THIRD_A_FAILURE);
  expectFailure(() => check(property, { reproduce: failure.blob }));
  assert.deepEqual(machine.seen, ["a", "a", "a"]);
});

// A continue-protocol blob replays in every shell, and blobs recorded under the
// stop decision keep their meaning.
test("pinned blobs of both protocols replay", () => {
  for (const [blob, protocol] of [
    [STATEFUL_THIRD_A_FAILURE, 3n],
    [STATEFUL_THIRD_A_STOP_PROTOCOL, 2n],
  ] as const) {
    assert.equal(statefulProtocolOf(blob), protocol);
    assert.deepEqual(replayThirdA(blob), ["a", "a", "a"]);
  }
  expectFailure(() => check(Ledger.property, { reproduce: Ledger.PORTABLE_LEDGER_FAILURE }));
});

test("the ledger bug shrinks to three steps", () => {
  const failure = Ledger.findAndReplayBug();
  const rendered = failure.message;
  assert.ok(rendered.includes("step 1: create_account"));
  assert.ok(rendered.includes("step 2: create_account"));
  assert.ok(rendered.includes("step 3: transfer"));
  assert.ok(!rendered.includes("step 4:"));
  assert.ok(rendered.includes("transfer 1"));
  expectFailure(() => check(Ledger.property, { reproduce: Ledger.PORTABLE_LEDGER_FAILURE }));
});

test("the roundtrip example shrinks to one character", () => {
  const failure = Roundtrip.findAndReplayBug();
  assert.ok(failure.message.includes('"0" became ""'));
  assert.equal(failure.blob, Roundtrip.PORTABLE_ROUNDTRIP_FAILURE);
});

test("an out-of-range shrink target clamps to the nearer bound", () => {
  const failure = expectFailure(() =>
    check((testCase) => {
      const value = testCase.draw(
        Generators.bigIntegers().minValue(0n).maxValue(10n).shrinkTowards(99n),
      );
      throw new Error(`always fails at ${value}`);
    }, { examples: 50, seed: 7n })
  );
  assert.equal(String(failure.cause), "Error: always fails at 10");
  assert.equal(failure.blob, CROSS_LANGUAGE_CLAMPED_TARGET);
});

test("the tour example scenarios", () => {
  assert.ok(Tour.shrinkTargets().message.includes("value 701"));
  assert.ok(Tour.evenNumbersOnly().message.includes("even value 52"));
  assert.ok(Tour.flagsAndBytes().message.includes("compressed=true payload=80"));
  assert.equal(Tour.boundedFloats().blob, CROSS_LANGUAGE_FLOAT_ONE);
  const rejected = Tour.rejectionLimit();
  assert.deepEqual([rejected.rejections, rejected.limit], [21, 20]);
});

test("the queue example finds and replays the off-by-one", () => {
  const failure = Queue.findAndReplayBug();
  assert.ok(failure.message.includes("step 1:"));
  assert.ok(failure.message.includes("pop"));
  assert.equal(failure.blob, Queue.PORTABLE_QUEUE_FAILURE);
});

// The shell-level counterpart to the golden vector gate. Every shell runs the
// same table from conformance/shell/shell_cases.tsv, so a behavior that drifts in one
// language fails there rather than in review.
//
// The tables live outside this package: they are shared with the other
// language packages so a behavior that drifts in one fails here. They are
// therefore not shipped with it, and where they are absent the cases skip and
// say so rather than passing quietly.

const CONFORMANCE = `${import.meta.dirname}/../../conformance`;

function conformanceTable(name: string): string[][] | null {
  const path = `${CONFORMANCE}/${name}`;
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => line.split("\t"));
}

function missingTables(name: string): string {
  return `${name} is missing: the shared conformance tables live in the Zizek source tree and are not shipped with this package`;
}

function shellCases(): string[][] | null {
  // The second table is generated by tools/tracegen from the real Hegel
  // engine, and read separately rather than merged into the hand-written one
  // so that it stays regenerable.
  const tables = ["shell/shell_cases.tsv", "shell/trace_vectors.tsv"].map(conformanceTable);
  return tables.some((table) => table === null) ? null : tables.flatMap((table) => table!);
}

// Replay a blob the real Hegel engine emitted. See tools/tracegen: the golden
// vectors bind each IR function to the engine, this binds a whole shell to it.
function caseTrace(rest: string[]): string | undefined {
  const [envelope, blob, script, expected] = rest;
  const ops = script.split(",");
  void envelope;
  const drawn: string[] = [];
  expectFailure(() =>
    check((testCase) => {
      for (const op of ops) drawn.push(traceDraw(testCase, op));
      throw new Error("replay");
    }, { reproduce: blob })
  );
  assert.equal(
    drawn.join(","),
    expected,
    `replayed the engine's blob as ${drawn.join(",")}, want ${expected}`,
  );
  return undefined;
}

test("shared shell cases", (t) => {
  const cases = shellCases();
  if (cases === null) {
    t.skip(missingTables("conformance/shell/shell_cases.tsv"));
    return;
  }
  assert.ok(cases.length > 0, "no shared shell cases were run");
  let pinned = 0;
  for (const [kind, ...fields] of cases) {
    // An optional trailing blob=<base64> pins the reproduce blob the case must
    // emit. It is stripped before dispatch so the handlers keep their
    // positional fields, and compared against what the handler returns.
    // See conformance/shell/shell_cases.tsv.
    const rest = [...fields];
    const last = rest[rest.length - 1];
    const expectedBlob = last?.startsWith("blob=") ? rest.pop()!.slice("blob=".length) : undefined;
    if (expectedBlob !== undefined) pinned += 1;
    const declared = runDeclaredShellCase(kind, rest);
    let emitted = declared.emitted;
    if (!declared.handled) switch (kind) {
      case "TRACE":
        emitted = caseTrace(rest);
        break;
      default:
        assert.fail(`unknown shell case ${kind}`);
    }
    if (expectedBlob !== undefined) {
      assert.equal(
        emitted,
        expectedBlob,
        `${kind} emitted ${emitted}, want the shared ${expectedBlob}`,
      );
    }
  }
  assert.ok(pinned > 0, "no shared case pinned its blob");
});

// The shared table below is the cross-language database gate. These tests pin
// the TypeScript surface's own defaults and best-effort filesystem behavior.

function databaseThresholdProperty(testCase: TestCase): void {
  if (testCase.integer(0, 100) >= 5n) throw new Error("value reached 5");
}

test("the database is disabled until requested", () => {
  const root = mkdtempSync(join(tmpdir(), "zizek-db-default-"));
  const before = process.cwd();
  try {
    process.chdir(root);
    check(() => {}, { examples: 1, seed: 1 });
    assert.equal(existsSync(join(root, ".zizek/examples")), false);
  } finally {
    process.chdir(before);
    rmSync(root, { recursive: true, force: true });
  }
});

test("database digests use the compiled key hash", () => {
  assert.equal(
    databaseDigest("split_is_exact"),
    keyHash("split_is_exact").toString(16).padStart(16, "0"),
  );
});

test("a stored counterexample is shrunk and replaced", () => {
  const database = new InMemoryDatabase();
  const larger = Uint8Array.from([1, 0, 0, 0, 0, 10, 1, 0, 0, 0, 50]);
  database.save("case", larger);
  const failure = expectFailure(() => check(databaseThresholdProperty, {
    examples: 200,
    seed: 1,
    database,
    databaseKey: "case",
  }));
  const shrunk = Core.rawFailureDecode(new TextEncoder().encode(failure.blob));
  assert.ok(shrunk !== null);
  assert.deepEqual(database.fetch("case"), [shrunk]);
  assert.notEqual([...shrunk].join(","), [...larger].join(","));
});

test("manual reproduce leaves the database untouched", () => {
  const found = expectFailure(() => check(databaseThresholdProperty, {
    examples: 200,
    seed: 1,
  }));
  const database = new InMemoryDatabase();
  expectFailure(() => check(databaseThresholdProperty, {
    reproduce: found.blob,
    database,
    databaseKey: "case",
  }));
  assert.deepEqual(database.fetch("case"), []);
});

test("an unwritable directory database never changes the verdict", () => {
  const root = mkdtempSync(join(tmpdir(), "zizek-db-surface-"));
  try {
    const blocked = join(root, "not-a-directory");
    writeFileSync(blocked, new Uint8Array());
    const database = new DirectoryDatabase(blocked);
    expectFailure(() => check(databaseThresholdProperty, {
      examples: 200,
      seed: 1,
      database,
      databaseKey: "case",
    }));
    assert.deepEqual(database.fetch("case"), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("directory storage ignores foreign files and removes empty keys", () => {
  const root = mkdtempSync(join(tmpdir(), "zizek-db-surface-"));
  try {
    const database = new DirectoryDatabase(root);
    const stream = new Uint8Array(4);
    database.save("case", stream);
    database.save("case", stream);
    const keyDirectory = database.keyPath("case");
    writeFileSync(join(keyDirectory, "README"), new TextEncoder().encode("keep"));
    assert.deepEqual(database.fetch("case"), [stream]);
    database.delete("case", stream);
    assert.equal(existsSync(keyDirectory), true, "foreign files keep the directory non-empty");
    assert.deepEqual(database.fetch("case"), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a run without an explicit database key uses the property name", () => {
  const database = new InMemoryDatabase();
  expectFailure(() => check(databaseThresholdProperty, {
    examples: 200,
    seed: 1,
    database,
  }));
  assert.equal(database.fetch("databaseThresholdProperty").length, 1);
});

test("shared database cases", (t) => {
  const cases = conformanceTable("database/database_cases.tsv");
  if (cases === null) {
    t.skip(missingTables("conformance/database/database_cases.tsv"));
    return;
  }
  assert.ok(cases.length > 0, "no shared database cases were run");
  let pinned = 0;
  for (const [kind, ...fields] of cases) {
    const rest = [...fields];
    const last = rest[rest.length - 1];
    const expectedBlob = last?.startsWith("blob=")
      ? rest.pop()!.slice("blob=".length)
      : undefined;
    const declared = runDeclaredDatabaseCase(kind, rest);
    assert.ok(declared.handled, `unknown database case ${kind}`);
    if (expectedBlob !== undefined) {
      pinned++;
      assert.equal(
        declared.emitted,
        expectedBlob,
        `${kind} emitted ${declared.emitted}, want the shared ${expectedBlob}`,
      );
    }
  }
  assert.ok(pinned > 0, "no shared database case pinned its blob");
});

// The catalogue combinators, pinned across every package that has them. just
// and oneOf's chosen branch record no choice of their own, and sampledFrom and
// oneOf record exactly one integer each, so the blob is the check that all
// four shells compose them identically.
const CROSS_LANGUAGE_CATALOGUE = "AAMAAAABAQAKAQAAAAIACgEAAAAA";

function catalogueDraw(testCase: TestCase): [boolean, bigint, bigint] {
  const flag = testCase.draw(Generators.booleans());
  const pick = testCase.draw(Generators.sampledFrom([2n, 3n, 5n, 7n]));
  const extra = testCase.draw(
    Generators.oneOf<bigint>(
      Generators.just(0n),
      Generators.bigIntegers({ min: 1n, max: 9n }),
    ),
  );
  return [flag, pick, extra];
}

test("catalogue generators shrink and replay portably", () => {
  const failure = expectFailure(() =>
    check((testCase) => {
      const [flag, pick] = catalogueDraw(testCase);
      if (flag && pick >= 5n) throw new Error("flagged and large");
    }, { examples: 300, seed: 1n })
  );
  assert.equal(failure.blob, CROSS_LANGUAGE_CATALOGUE);

  const seen: [boolean, bigint, bigint][] = [];
  expectFailure(() =>
    check((testCase) => {
      seen.push(catalogueDraw(testCase));
      throw new Error("replay");
    }, { reproduce: failure.blob })
  );
  // oneOf shrinks towards its first branch, so the minimal example takes
  // just(0) rather than paying for an integer draw.
  assert.deepEqual(seen, [[true, 5n, 0n]]);
});

// flat_map, pinned across every package that has it. The drawn scale decides
// the inner generator's bounds, so the two draws only make sense together;
// the blob is the check that all nine shells compose and shrink the bind
// identically.
const CROSS_LANGUAGE_FLAT_MAP = "AXicY2IAAi5GBjjFCgABCgAe";

function flatMapScaled() {
  return Generators.flatMap(
    Generators.bigIntegers({ min: 0n, max: 3n }),
    (scale) => Generators.bigIntegers({ min: scale * 10n, max: scale * 10n + 100n }),
  );
}

test("flat_map shrinks and replays portably", () => {
  const failure = expectFailure(() =>
    check((testCase) => {
      if (testCase.draw(flatMapScaled()) >= 5n) throw new Error("value reached 5");
    }, { examples: 300, seed: 1n })
  );
  assert.equal(failure.blob, CROSS_LANGUAGE_FLAT_MAP);

  const seen: bigint[] = [];
  expectFailure(() =>
    check((testCase) => {
      seen.push(testCase.draw(flatMapScaled()));
      throw new Error("replay");
    }, { reproduce: failure.blob })
  );
  // The minimal example takes scale 0, then the smallest value the property
  // notices.
  assert.deepEqual(seen, [5n]);
});

test("targeting steers generation toward high scores", () => {
  // With 200 examples the compiled schedule fires the hill climber at 100
  // valid examples; unguided random search hits the failing band in roughly
  // one example per ten thousand.
  const failure = expectFailure(() =>
    check((testCase) => {
      const value = testCase.integer(0n, 100_000n);
      testCase.target(Number(value));
      if (value >= 99_990n) throw new Error("reached the top");
    }, { examples: 200, seed: 5n })
  );

  const seen: bigint[] = [];
  expectFailure(() =>
    check((testCase) => {
      seen.push(testCase.integer(0n, 100_000n));
      throw new Error("replay");
    }, { reproduce: failure.blob })
  );
  assert.deepEqual(seen, [99_990n]);
});

test("targeting climbs each label separately", () => {
  // The failing band is reachable only through the *second* label in sorted
  // order, so finding it requires the per-label bookkeeping: "high" is
  // climbed first, discovers nothing, and the climb moves on to "low".
  const failure = expectFailure(() =>
    check((testCase) => {
      const low = testCase.integer(0n, 20_000n);
      const high = testCase.integer(0n, 20_000n);
      testCase.target(Number(low), "low");
      testCase.target(Number(high), "high");
      if (low >= 19_990n) throw new Error("low climbed");
    }, { examples: 600, seed: 7n })
  );

  const seen: [bigint, bigint][] = [];
  expectFailure(() =>
    check((testCase) => {
      seen.push([testCase.integer(0n, 20_000n), testCase.integer(0n, 20_000n)]);
      throw new Error("replay");
    }, { reproduce: failure.blob })
  );
  assert.deepEqual(seen, [[19_990n, 0n]]);
});

test("target validates scores and labels", () => {
  check((testCase) => {
    testCase.target(3.5);
    assert.throws(() => testCase.target(4.0), /at most once/);
    assert.throws(() => testCase.target(NaN, "other"), /finite/);
    testCase.target(1.0, "second");
  }, { examples: 1 });
});

test("map and filter compose without recording a choice", () => {
  const doubled = Generators.map(
    Generators.bigIntegers({ min: 0n, max: 10n }),
    (v) => v * 2n,
  );
  const evens = Generators.filter(
    Generators.bigIntegers({ min: 0n, max: 20n }),
    (v) => v % 2n === 0n,
  );
  const drawn: [bigint, bigint][] = [];
  check((testCase) => {
    drawn.push([testCase.draw(doubled), testCase.draw(evens)]);
  }, { examples: 50, seed: 3n });
  assert.ok(drawn.every(([a, b]) => a % 2n === 0n && b % 2n === 0n));
});

test("tuples and none draw in order", () => {
  const seen: unknown[][] = [];
  check((testCase) => {
    seen.push(testCase.draw(Generators.tuples(
      Generators.just(1n),
      Generators.none(),
      Generators.booleans(),
    )));
  }, { examples: 1 });
  assert.deepEqual(seen, [[1n, null, false]]);
});

// ---------- coverage assertions ----------

test("sometimes that never held fails the run", () => {
  const property = (testCase: TestCase): void => {
    const value = testCase.integer(0, 10);
    testCase.sometimes("value above range", value > 1000n);
  };
  const missed = expectThrown(FailedCoverage, () => check(property, { examples: 20, seed: 5 }));
  assert.equal(missed.label, "value above range");
  assert.equal(missed.observed, 0);
  assert.equal(missed.valid, 20);
  assert.equal(missed.minPercent, 0);
});

test("sometimes that held once passes", () => {
  let attempts = 0;
  check((testCase) => {
    attempts++;
    testCase.sometimes("first example", attempts === 1);
  }, { examples: 20, seed: 5 });
});

test("a declared label that never executed fails the run", () => {
  const missed = expectThrown(FailedCoverage, () =>
    check(() => {}, { examples: 10, require: [{ label: "unreached branch" }] })
  );
  assert.equal(missed.label, "unreached branch");
  assert.equal(missed.observed, 0);
  assert.equal(missed.valid, 10);
});

test("a declared label observed at a call site passes", () => {
  check((testCase) => {
    testCase.sometimes("reached", true);
  }, { examples: 10, require: [{ label: "reached" }] });
});

test("declared labels are checked before observed ones", () => {
  const missed = expectThrown(FailedCoverage, () =>
    check((testCase) => {
      testCase.sometimes("observed but missed", false);
    }, { examples: 5, require: [{ label: "declared and missed" }] })
  );
  assert.equal(missed.label, "declared and missed");
});

test("cover counts once per example and enforces the rate", () => {
  let attempts = 0;
  const property = (testCase: TestCase): void => {
    attempts++;
    // Two hits at the same call-site label in one example count once.
    testCase.cover("first example", attempts === 1, { percent: 100 });
    testCase.cover("first example", attempts === 1, { percent: 100 });
  };
  const missed = expectThrown(FailedCoverage, () => check(property, { examples: 4, seed: 5 }));
  assert.equal(missed.observed, 1);
  assert.equal(missed.valid, 4);
  assert.equal(missed.minPercent, 100);
});

test("rejected examples discard coverage observations", () => {
  let attempts = 0;
  const property = (testCase: TestCase): void => {
    attempts++;
    // The condition holds only on attempts an assumption then rejects, so a
    // shell that commits observations from rejected examples passes.
    testCase.sometimes("rejected attempts only", attempts % 2 === 1);
    testCase.assume(attempts % 2 === 0);
  };
  const missed = expectThrown(FailedCoverage, () => check(property, { examples: 10, seed: 5 }));
  assert.equal(missed.observed, 0);
});

test("coverage is not checked when a run finds a counterexample", () => {
  expectFailure(() =>
    check((testCase) => {
      testCase.sometimes("never held", false);
      throw new Error("real bug");
    }, { examples: 10, seed: 5 })
  );
});

test("reproduce skips coverage verdicts", () => {
  const property = (testCase: TestCase): void => {
    testCase.integer(0, 10);
    throw new Error("always fails");
  };
  const failure = expectFailure(() => check(property, { examples: 5, seed: 5 }));
  expectFailure(() =>
    check(property, {
      reproduce: failure.blob,
      require: [{ label: "impossible during replay" }],
    })
  );
});

test("required coverage percent is validated", () => {
  expectThrown(RangeError, () =>
    check(() => {}, { examples: 1, require: [{ label: "rate", percent: 101 }] })
  );
});

test("an always failure shrinks to the simplest violation", () => {
  const property = (testCase: TestCase): void => {
    const value = testCase.integer(0, 100);
    testCase.always("value stays small", value < 5n);
  };
  const failure = expectFailure(() => check(property, { examples: 100, seed: 3 }));
  assert.ok(String(failure.propertyCause).includes('always: "value stays small" did not hold'));
  const replayed: bigint[] = [];
  const replayFn = (testCase: TestCase): void => {
    const value = testCase.integer(0, 100);
    replayed.push(value);
    testCase.always("value stays small", value < 5n);
  };
  expectFailure(() => check(replayFn, { reproduce: failure.blob }));
  assert.equal(replayed[replayed.length - 1], 5n);
});

// Two assertions with disjoint failing ranges. The shrinker must stay on
// whichever bug generation found: if both call sites collapsed into one
// origin, a search that found the 90..100 bug would accept 40..60 candidates
// as progress and report the wrong assertion's boundary.
test("two always sites are distinct bugs", () => {
  const property = (testCase: TestCase): void => {
    const value = testCase.integer(0, 100);
    testCase.always("mid stays out", !(value >= 40n && value <= 60n));
    testCase.always("large stays out", value < 90n);
  };
  const failure = expectFailure(() => check(property, { examples: 100, seed: 3 }));
  const replayed: bigint[] = [];
  const replayFn = (testCase: TestCase): void => {
    const value = testCase.integer(0, 100);
    replayed.push(value);
    testCase.always("mid stays out", !(value >= 40n && value <= 60n));
    testCase.always("large stays out", value < 90n);
  };
  expectFailure(() => check(replayFn, { reproduce: failure.blob }));
  const expected = String(failure.propertyCause).includes("mid stays out") ? 40n : 90n;
  assert.equal(replayed[replayed.length - 1], expected);
});

test("an always that holds passes and covers its label", () => {
  check((testCase) => {
    testCase.always("invariant", true);
  }, { examples: 10, require: [{ label: "invariant" }] });
});

test("a required always site that never runs fails the run", () => {
  const property = (testCase: TestCase): void => {
    const value = testCase.integer(0, 10);
    if (value > 1000n) testCase.always("guarded invariant", true);
  };
  const missed = expectThrown(FailedCoverage, () =>
    check(property, { examples: 20, seed: 5, require: [{ label: "guarded invariant" }] })
  );
  assert.equal(missed.label, "guarded invariant");
});

test("unreachable fails with the simplest reaching input", () => {
  const property = (testCase: TestCase): void => {
    const value = testCase.integer(0, 100);
    if (value > 5n) testCase.unreachable("dead branch");
  };
  const failure = expectFailure(() => check(property, { examples: 100, seed: 3 }));
  assert.ok(String(failure.propertyCause).includes('unreachable: "dead branch" was reached'));
  const replayed: bigint[] = [];
  const replayFn = (testCase: TestCase): void => {
    const value = testCase.integer(0, 100);
    replayed.push(value);
    if (value > 5n) testCase.unreachable("dead branch");
  };
  expectFailure(() => check(replayFn, { reproduce: failure.blob }));
  assert.equal(replayed[replayed.length - 1], 6n);
});

test("an unreachable that is never reached passes", () => {
  check((testCase) => {
    const value = testCase.integer(0, 10);
    if (value > 1000n) testCase.unreachable("dead branch");
  }, { examples: 20, seed: 5 });
});


// ---------- cloned streams ----------

function cloneProperty(threshold: bigint, seen: bigint[]) {
  return (testCase: TestCase): void => {
    const outer = testCase.integer(0, 100);
    const child = testCase.cloneStream();
    const inner = child.integer(0, 100);
    const tail = testCase.integer(0, 100);
    seen.splice(0, seen.length, outer, inner, tail);
    if (inner >= threshold) throw new Error(`inner too big: ${inner}`);
  };
}

test("a cloned stream is framed inside the parent's blob and replays", () => {
  const seen: bigint[] = [];
  const failure = expectFailure(() =>
    check(cloneProperty(40n, seen), { examples: 200, seed: 7 })
  );
  const raw = Core.rawFailureDecode(asciiBytes(failure.blob));
  assert.notEqual(raw, null);
  assert.ok(Core.choiceStreamValidate(raw!));
  // Three top-level entries: the outer draw, the clone, the trailing draw.
  assert.equal(Core.choiceStreamCount(raw!), 3n);
  const offset = Core.choiceOffsetAt(raw!, 1n);
  assert.notEqual(offset, null);
  assert.equal(raw![Number(offset!)], 5);
  const inner = Core.cloneInnerStream(raw!, offset!);
  assert.notEqual(inner, null);
  assert.equal(Core.choiceStreamCount(inner!), 1n);

  const replayed: bigint[] = [];
  expectFailure(() => check(cloneProperty(40n, replayed), { reproduce: failure.blob }));
  assert.ok(replayed[1] >= 40n);
});

test("a clone's own choices shrink to the same minimum from every seed", () => {
  // Without a nested pass the flat passes step over the clone as one atomic
  // entry and report whatever value generation found.
  let blob: string | null = null;
  for (const seed of [1, 2, 3, 7, 11]) {
    const seen: bigint[] = [];
    const failure = expectFailure(() =>
      check(cloneProperty(40n, seen), { examples: 200, seed })
    );
    assert.deepEqual(seen, [0n, 40n, 0n], `seed ${seed}`);
    blob ??= failure.blob;
    assert.equal(failure.blob, blob, `seed ${seed}`);
  }
});

test("nested clones shrink at every depth", () => {
  const seen: bigint[] = [];
  const property = (testCase: TestCase): void => {
    const child = testCase.cloneStream();
    const outer = child.integer(0, 100);
    const grandchild = child.cloneStream();
    const inner = grandchild.integer(0, 100);
    seen.splice(0, seen.length, outer, inner);
    if (outer >= 10n && inner >= 20n) throw new Error(`both too big: ${outer} ${inner}`);
  };
  const failure = expectFailure(() => check(property, { examples: 300, seed: 4 }));
  assert.deepEqual(seen, [10n, 20n]);
  expectFailure(() => check(property, { reproduce: failure.blob }));
  assert.deepEqual(seen, [10n, 20n]);
});

test("replaying a non-clone entry puns to an empty child", () => {
  const stream = serializedDraws([
    {
      kind: "integer",
      encoded: Core.serializeIntegerChoice(signedBytes(3n)),
      value: 3n,
      params: [0n, 100n, 0n],
      forced: false,
      key: null,
    },
  ] as Draw[]);
  const blob = Core.rawFailureEncode(stream);
  let caught: unknown = null;
  try {
    check((testCase) => {
      testCase.integer(0, 100);
      const child = testCase.cloneStream();
      child.integer(0, 100);
    }, { reproduce: blob });
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof ReplayOverrun, `expected an overrun, got ${caught}`);
});

test("a clone's notes and costs reach the family report", () => {
  check((testCase) => {
    const child = testCase.cloneStream();
    child.note("from the clone");
    child.cost("faults", 2);
    child.integer(0, 10);
    assert.deepEqual(testCase.notes, ["from the clone"]);
    assert.equal(testCase.totalCost(), 2n);
  }, { examples: 5, seed: 1 });
});

test("cloning past the nesting limit rejects the example", () => {
  // The wire format refuses to validate a stream nested deeper than 100, so the
  // shell refuses to build one. Upstream concludes the family invalid there,
  // which is a rejection rather than a property failure.
  expectRejectedRun(() =>
    check((testCase) => {
      let at = testCase;
      for (let i = 0; i <= MAX_CLONE_DEPTH; i++) at = at.cloneStream();
      throw new Error("reached past the nesting limit");
    }, { examples: 5, seed: 1 })
  );
});
