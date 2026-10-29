# Zizek for TypeScript — feature guide

A walkthrough of every feature the TypeScript runner currently supports, with
runnable examples for each. See [README.md](README.md) for installation and the
basics, and [dev.md](dev.md) for how the package is built; this guide is about
*using* the API.

New to Zizek? [A worked example](#a-worked-example-splitting-a-bill) at the end
finds one real bug end to end; the rest of this guide is the reference tour.

## Public API

Import everything from `@less-than-nothing/zizek`; the package exposes no other module.
The APIs described in this guide are supported, including these extension
protocols:

- Custom generators are any object with a `doDraw(testCase)` method — the
  `Generator<T>` interface.
- Custom state machines implement `Stateful.Machine<M>`: `rules` and
  `invariants` arrays of named entries.
- Custom example databases implement `Database`: `fetch`, `save`, and
  `delete`.

A property's test case exposes `draw`, `integer`, `float`, `boolean`,
`weighted`, `bytes`, `string`, `cloneStream`, `nextKey`, `assume`, `note`,
`always`, `unreachable`, `sometimes`, `cover`, `cost`, `target`, `startSpan`,
and `stopSpan`. Read results from `Failure` and the other error types `check`
throws.

The generated core, recorded draws, the shrinker's helpers, the RNG, and the
test case's bookkeeping are internal. They are not exported, or are left out
of the published type declarations, and are not supported extension points.

## Ordinary and exact integers

The ordinary integer generator returns safe JavaScript `number` values, so its
results work directly with sorting, JSON, array indexes, and number-only APIs:

```ts
const value = testCase.draw(Generators.integers({ min: 0, max: 100 })); // number
if (value > 5) { /* ... */ }
```

Use `Generators.bigIntegers()` when the property needs an exact `bigint` value.
The low-level recorded integer choice is also `bigint`-valued:

```ts
const exact = testCase.draw(Generators.bigIntegers({ min: 0n, max: 100n }));
const lowLevel = testCase.integer(0, 100);
if (exact > 5n || lowLevel > 5n) { /* ... */ }
```

`Generators.integers()` rejects fractional or unsafe bounds before a run
starts. Both integer facades still record exact choices internally, so choosing
the ergonomic `number` result does not weaken blobs, replay, or shrinking.
Float draws return `number`, text draws return `string`, and byte draws return
`Uint8Array`.

## Properties and `check`

A property is a function taking a test case. It fails by throwing: any thrown
value counts, so `node:assert` works as well as a plain `Error`.

```ts
import { check, Generators, type TestCase } from "@less-than-nothing/zizek";

function property(testCase: TestCase): void {
  const value = testCase.draw(Generators.integers({ min: -100, max: 100 }));
  if (value >= 5) throw new Error(`value must be less than five: ${value}`);
}

check(property, { examples: 200, seed: 1 });
```

`check` is synchronous. Passing an `async` function or otherwise returning a
Promise raises a `TypeError`; asynchronous property execution is not yet part
of this shell.

`check` takes an options object:

| Option | Default | Meaning |
|--------|---------|---------|
| `examples` | 100 | Valid (non-rejected) examples to run before declaring success. |
| `maxRejections` | 458 | Initial rejection allowance; each valid example earns 100 more. |
| `suppressFilterTooMuch` | `false` | Disable the early excessive-filtering health check. |
| `suppressDataTooLarge` | `false` | Disable the early choice-budget-overrun health check. |
| `suppressLargeBaseExample` | `false` | Allow an all-simplest input that uses more than half the choice budget. |
| `suppressTooSlow` | `false` | Disable the one-second cumulative generator-time health check. |
| `maxShrinks` | 500 | Accepted shrink candidates before the search stops; `0` disables the cap. |
| `maxStall` | 200 | Consecutive fruitless shrink attempts before the search stops; `0` disables the cap. |
| `seed` | random | Seed for random exploration. Fixed seeds make a run reproducible on one machine; portable reproduction uses blobs instead. |
| `reproduce` | — | A failure blob. When set, `check` replays exactly that example and runs nothing else. |
| `require` | `[]` | Coverage labels the run must satisfy; see [Coverage assertions](#coverage-assertions). |

On failure `check` throws:

- `Failure` — a property failed; it is already shrunk and carries a reproduce
  blob;
- `Flaky` — a property failed, then did not fail the same way when that
  example was replayed; it carries the original error (`propertyCause`) and
  the unshrunk example's blob;
- `TooManyRejections` — assumptions rejected too many examples;
- `FailedCoverage` — a required coverage label was not satisfied by the run;
- `FailedHealthCheck` — a health check fired;
- `InvalidReplay` / `ReplayOverrun` — a reproduce blob is malformed or does not
  match the property's draws.

Every error type carries the fields a report needs: `Failure` has `blob`,
`propertyCause` (also `cause`), `notes`, `examplesRun`, `rejections`, `puns`,
`keyMisses`, and `costs`; `FailedHealthCheck` has `check`, the check's name;
`FailedCoverage` has `label`, `observed`, `valid`, and `minPercent`; and
`TooManyRejections` has `rejections` and `limit`.

Because every failure mode is a throw, narrow with `instanceof` and rethrow
what you did not expect:

```ts
try {
  check(property, { examples: 200, seed: 1 });
} catch (error) {
  if (!(error instanceof Failure)) throw error;
  console.log(error.blob);
  console.log(error.propertyCause); // the original thrown value; also error.cause
  console.log(error.notes);
}
```

### Repeating a search versus replaying an example

Two options look similar and do opposite things:

- `seed` repeats a *search*. The same seed, the same property, and the same
  package version explore the same examples in the same order — useful while
  you are iterating, and worth nothing to anyone on another machine or in
  another language.
- `reproduce` replays one *example*. The blob is the recorded choice sequence,
  so it reproduces bit-exactly anywhere, and `check` runs that one example and
  stops.

For a bug you want to keep, neither is the durable answer: put the
counterexample in the [example database](#the-example-database), or paste the
blob into a regression test.

## Low-level draws

`TestCase` exposes the recorded primitive choices directly:

```ts
const value = testCase.integer(0, 100);        // bigint, shrinks toward 0
const nudged = testCase.integer(0, 100, 10);   // shrinks toward 10
const flag = testCase.boolean();               // shrinks toward false
const biased = testCase.weighted(0.25);        // true a quarter of the time
const payload = testCase.bytes(1, 4);          // Uint8Array, 1..4 bytes, shortlex
const ratio = testCase.float(0, 1);            // number
const name = testCase.string(1, 8);            // string
```

Every draw is recorded, which is what makes shrinking and blob replay work.
Narrow integer ranges (fewer than 256 values) are drawn uniformly, so a draw
that indexes a list picks every option equally often. Wide ranges use a
per-case swarm: the generated core supplies candidates such as the interval
endpoints and values near zero, so bugs at boundaries (like `1n` in
`0..1_000_000`) are found reliably.

`testCase.float` takes its options as a trailing object — `allowNan`,
`allowInfinity`, and `smallestNonzeroMagnitude`. By default NaN and the
infinities are excluded.

## Generator objects

`testCase.draw(generator)` routes any object with a `doDraw(testCase)` method
through the test case, so a bare object literal is a valid generator:

```ts
const value = testCase.draw(Generators.integers({ min: -100, max: 100 }));
const name = testCase.draw(Generators.text({ minSize: 1, maxSize: 8 }));
```

Configurable scalar and collection factories have two spellings that build the
same generator: an options object for one-shot use, and an immutable fluent
builder for a generator you mean to name and reuse.

```ts
const small = Generators.integers({ min: 0, max: 100 });
const alsoSmall = Generators.integers().minValue(0).maxValue(100);
```

Builders are immutable — each configuration call returns a new generator — so
they can be shared and reused freely.

### Scalars

- `Generators.integers` — safe JavaScript `number` integers, bounded with
  `min`/`max` (`minValue`/`maxValue`); `shrinkTowards` moves the shrink
  destination.
- `Generators.bigIntegers` — exact `bigint` values, with bigint-valued bounds
  spanning at most `2^64` values and the same immutable builder methods.
- `Generators.floats` — IEEE-754 doubles bounded with `min`/`max`, plus
  `allowNan`, `allowInfinity`, and `smallestNonzeroMagnitude`. Shrinking is
  portable: simple values (integral, few significant digits) come before gnarly
  bit patterns, and `-0` sorts below `0`.
- `Generators.booleans` — shrinks toward `false`.
- `Generators.binary` — `Uint8Array` payloads bounded with `minSize`/`maxSize`,
  ordered shortlex.
- `Generators.text` — text over an alphabet, by default every Unicode scalar
  value. `minSize`/`maxSize` bound the length **in characters**, and
  `{ alphabet: "abc" }` or `alphabetRange(0x20, 0x7e)` narrows the characters
  drawn. Values shrink towards `"0"`, then the digits and uppercase letters, so
  a minimal failing string is one you can retype.
- `Generators.characters` — exactly one character, optionally from an explicit
  alphabet.

```ts
import { alphabetRange, Generators } from "@less-than-nothing/zizek";

const printable = Generators.text({ maxSize: 8, alphabet: alphabetRange(0x20, 0x7e) });
```

### Collections

- `Generators.arrays(element)` — a variable-length array, bounded with
  `minSize`/`maxSize`. Each element is recorded as its own span, so the
  shrinker deletes whole elements — including ones in the middle — before it
  simplifies the values inside them. `Generators.lists` is a compatibility
  alias with identical behavior and blobs.
- `Generators.sets(element)`, `Generators.maps(keys, values)`, and
  `Generators.uniqueLists(element, { uniqueBy })` — the same sequence with a
  distinctness constraint. A value that repeats one already drawn costs the
  *element*, not the example: its choices are discarded and another candidate
  is drawn. Asking for more distinct values than the element generator can
  produce rejects the example rather than looping, so
  `Generators.sets(Generators.integers({ min: 0, max: 1 }), { minSize: 5 })`
  fails the run with `FailedHealthCheck` (`filter_too_much`) instead of
  hanging — every example is rejected, and the health check says so before the
  rejection budget runs out.

`sets` returns a `Set`, `maps` returns a `Map`, and `uniqueLists` returns an
array in draw order. Distinctness is judged with SameValueZero — the rule
`Set` and `Map` use — which has two consequences worth knowing:

- **Objects deduplicate by identity, not by value.** Two structurally equal
  objects are two distinct elements. Draw primitives, or pass `uniqueBy` a key
  function that projects to one.
- **`-0` and `0` are one value, and all NaNs are one value.** That contradicts
  the sign-aware float ordering the choice layer uses, where `-0` sorts below
  `0` and every NaN payload has its own slot, so a set of floats never holds
  both zeros. It is the TypeScript analogue of Java's `Double.equals` hazard.
  Where the distinction matters, draw a `Generators.arrays` and check
  `Object.is` yourself.

### Combinators

- `Generators.just(value)` and `Generators.none()` — constants, drawing nothing.
- `Generators.sampledFrom(values)` — one of a fixed array, recorded as an index.
- `Generators.oneOf(...generators)` — picks a branch, recorded as an index.
- `Generators.optional(generator)` — `null` or a generated value, shrinking
  towards `null`.
- `Generators.tuples(...generators)` — draws each part in order.
- `Generators.record(fields)` — draws a typed plain object's fields in property
  enumeration order.
- `Generators.map(source, transform)` — reshapes a drawn value; the transform
  is not recorded, so it must be a pure function of the value.
- `Generators.filter(source, predicate)` — retries the element a bounded number
  of times, then rejects the example.
- `Generators.flatMap(source, transform)` — builds the *next generator* from
  each drawn value (monadic bind); both draws share one `flat_map` span, so
  the shrinker can delete or simplify the unit together.
- `Generators.recursive(leaf, branch)` — bounded trees and other
  recursively-defined values; see [Recursive generators](#recursive-generators).
- `Generators.composite(build)` — writes a generator as a function that draws
  whatever it likes:

```ts
const sortedPair = Generators.composite((draw) => {
  const low = draw(Generators.integers({ min: 0, max: 100 }));
  const high = draw(Generators.integers({ min: low, max: 100 }));
  return [low, high] as const;
});

const person = Generators.record({
  name: Generators.text({ minSize: 1, maxSize: 20 }),
  age: Generators.integers({ min: 0, max: 120 }),
  nickname: Generators.optional(Generators.text({ minSize: 1, maxSize: 12 })),
});
```

### Recursive generators

`Generators.recursive(leaf, branch)` takes a generator for leaf values and a
function that receives the generator for child subtrees. The function returns
a generator that combines one or more children into the same result type:

```ts
type Tree =
  | { kind: "leaf"; value: number }
  | { kind: "branch"; left: Tree; right: Tree };

const leaves = Generators.map(
  Generators.integers({ min: 0, max: 9 }),
  (value): Tree => ({ kind: "leaf", value }),
);

const trees = Generators.recursive<Tree>(
  leaves,
  (subtrees) => Generators.composite<Tree>((draw) => ({
    kind: "branch",
    left: draw(subtrees),
    right: draw(subtrees),
  })),
).maxDepth(6).maxLeaves(32);

const tree = testCase.draw(trees);
```

The defaults are a maximum branch depth of 32 and at most 100 leaves.
`maxDepth(0)` produces leaves only; `maxLeaves` bounds the total base values,
not the number of branch nodes. An attempt that exceeds the leaf budget is
discarded and retried with a lower branching probability. If bounded retries
cannot construct a value, the example is rejected like a failed assumption.

Every subtree occupies a `recursive` span. The shrinker can therefore replace
an outer tree with one of its descendants, hoisting a deeply nested witness to
the root before simplifying its leaves. A leaf forced by `maxDepth` is still a
recorded decision, so replay and the shrinker's choice positions stay aligned.

### Shrink targets

By default integers shrink toward `0` (clamped into the interval). With
`shrinkTowards`, the reported counterexample is the failing value closest to
your target rather than the smallest one:

```ts
const value = testCase.draw(
  Generators.integers({ min: -1000, max: 1000, shrinkTowards: 500 }),
);
// if the property fails for value > 700, the failure shrinks to exactly 701
```

Run [`examples/tour.ts`](examples/tour.ts) to watch this happen.

## Assumptions

`testCase.assume(condition)` rejects the current example when the condition is
false. Rejection is control flow, not failure: `check` keeps generating until it
has run `examples` valid examples or exceeds the adaptive rejection budget
`maxRejections + 100 * valid`, at which point it throws `TooManyRejections`.

```ts
const value = testCase.integer(0, 100);
testCase.assume(value % 2n === 0n); // odd draws are discarded, not failed
```

Shrinking respects assumptions too: a shrink candidate that gets rejected is
skipped, so the shrunk counterexample always satisfies every assumption.

## Coverage assertions

A property can pass vacuously: the branch it exists to test never executes, and
the run goes green. `testCase.sometimes(label, condition)` turns that silent gap
into a failure — the condition must hold in at least one valid example of the
run — and `testCase.cover(label, condition, { percent })` requires a rate. The
verdict is per run, not per example; observations from rejected or overrun
examples are discarded with the rest of the example. Labels whose call site may
itself never execute are declared up front:

```ts
check(property, {
  require: [{ label: "overflow path" }, { label: "cache hit", percent: 30 }],
});
```

A missed requirement throws `FailedCoverage` naming the label and counters — no
counterexample, so no blob or shrinking; the same seed reproduces the same
verdict. The per-example half is sugar over ordinary failure:
`testCase.always(label, condition)` fails the example the moment its condition
does not hold (and, holding, counts as covering its label, so pairing it with
`require` also demands the site be reached), while
`testCase.unreachable(label)` fails the example that reaches it, shrinking to
the simplest reaching input. The verdict is compiled from the shared core,
so every language package agrees on it.

## Notes

`testCase.note(message)` attaches a diagnostic line to the current example.
Notes are collected per example and reported on the shrunk failure — both in
`failure.notes` and in the rendered `Trace:` section — so they describe the
*minimal* example, not the noisy first one.

```ts
testCase.note(`transfer ${amount} from ${source} to ${destination}`);
```

Template literals interpolate a `bigint` without ceremony; use
`JSON.stringify(value)` for strings so an empty or whitespace-only
counterexample is visible in the trace.

## Failures, blobs, and replay

A shrunk failure carries a portable, base64 reproduce blob:

```ts
try {
  check(property, { examples: 200, seed: 1 });
} catch (error) {
  if (!(error instanceof Failure)) throw error;
  // Replays exactly the recorded choices — nothing is random.
  check(property, { reproduce: error.blob });
}
```

Blobs encode the recorded choice sequence, not the RNG seed, so they replay
bit-exactly across machines *and languages*: a blob printed by the TypeScript
runner replays in the Go, Python, Ruby, Rust, Zig, Java, C++, Clojure, and C#
packages (the shared fixture `AAEAAAAACgEAAAAF` replays the integer `5` in every
one of them, and the ledger and queue examples pin cross-language blob fixtures
of their own).

Replay is defensive:

- a structurally invalid blob throws `InvalidReplay`;
- a blob that ends before the property stops drawing throws `ReplayOverrun`;
- a choice of the wrong kind (or out of range) puns to the requested draw's
  unit value instead of failing, so replay stays deterministic while you edit
  the property.

A pun keeps the replay running, but it means the values you get back are not the
ones the blob recorded — and nothing in the values themselves says so. It bites
hardest when a draw's bounds depend on earlier draws, because then the same blob
can fit one run and pun on the next. Every replay therefore counts its puns:
`failure.puns` reports how many, and a non-zero count adds a warning line to the
rendered failure. Treat it as "this blob no longer reproduces what it recorded",
not as a hard error.

## Keyed draws

Positional replay gives a draw its meaning from how many draws came before it,
which is exactly right until the property changes shape: insert one new draw
and every recorded choice after it answers the wrong question. A keyed draw is
addressed by a *name* instead, so a blob keeps meaning what it recorded while
the property around it evolves:

```ts
import { keyHash } from "@less-than-nothing/zizek";

const timeout = testCase.integer(1, 30, 0, keyHash("timeout"));
const retries = testCase.integer(0, 9, 0, keyHash("retries"));
```

Every primitive draw takes a key as its last argument: `integer(min, max,
shrinkTowards, key)`, `boolean(key)`, `weighted(probability, key)`,
`bytes(min, max, key)`, `string(min, max, alphabet, key)`, and `float`'s
`{ key }` option. The key is a `bigint` from one of two helpers:

- **`keyHash(...components)`** names a decision made at most once per example.
  Components are strings, numbers, or bigints in any mix —
  `keyHash("read", connection, sequence)` is the shape this is for — hashed by
  the compiled encoding, so the same name means the same entry in every
  language package.
- **`testCase.nextKey(...components)`** appends an execution-local ordinal,
  counted *within that name*, for a decision made repeatedly.
  `testCase.nextKey("read", connection)` numbers that connection's reads
  independently of every other sequence, so inserting a read on one connection
  shifts nothing on the others.

```ts
const connection = testCase.integer(1, 4, 0, keyHash("connection"));
for (let read = 0; read < 3; read++) {
  const payload = testCase.bytes(0, 16, testCase.nextKey("read", connection));
  testCase.note(`read ${payload.length} bytes`);
}
```

On replay a keyed draw looks its name up wherever it sits in the stream, and
the positional cursor steps over keyed entries, so the two addressing modes
never shift each other. A name the blob does not carry means the property
changed, not that the blob is malformed: the draw uses its simplest value, and
the failure counts and reports the miss (`failure.keyMisses`, plus a warning
line) instead of throwing:

```text
warning: 1 keyed draw was not in this blob and used the simplest value instead
```

`nextKey`'s counter is execution-local by construction. A counter that
outlived one example would produce different keys on the replay than on the
run that recorded it, and every draw would miss.

## The example database

Set `database` and a failure outlives the run that found it:

```ts
check(splitIsExact, { database: ".zizek/examples", databaseKey: "split_is_exact" });
```

The next run replays every stored entry for that key *before* it generates
anything, so a bug found yesterday reproduces on the first example — no search,
no seed. An entry that no longer reproduces — because the bug was fixed — is
deleted on the replay that failed to reproduce it, so the directory keeps
itself current. So is one that no longer parses.

The database is off until asked for: a library call that wrote into your
working directory unasked would be a surprise. The option takes:

| Value | Database |
|-------|----------|
| `true` | a `DirectoryDatabase` at `DEFAULT_DATABASE_PATH`, `.zizek/examples` |
| a path | a `DirectoryDatabase` there |
| `":memory:"` | an `InMemoryDatabase`, which forgets when the process exits |
| a `Database` object | that object |
| `false`, `null`, or omitted | none |

`Database` is a three-method interface over property *names*, so a backend of
your own can key however its store prefers:

```ts
interface Database {
  fetch(key: string): readonly Uint8Array[];
  save(key: string, value: Uint8Array): void;
  delete(key: string, value: Uint8Array): void;
}
```

Every operation is best-effort: a database that cannot be read or written
must not fail a test that would otherwise pass.

What makes this more than a cache is the layout. What is stored is the **raw
choice stream**, not the base64 blob, in `<root>/<key digest>/<stream digest>`,
with both digests being the FNV-1a hash keyed draws already use —
`databaseDigest` exposes it:

```
.zizek/examples/
  ac8d120993b8d6ef/          # the key's digest
    .name                    # the property's name, for a human
    08e264e7e651ae39         # a stored stream
```

The Go, Python, and Ruby packages write that directory identically, so a
counterexample your TypeScript suite found replays in your Go service's suite
out of one checked-in directory — provided both name the property the same
with `databaseKey`. Left unset, the key is the property function's `name`:
stable across runs, and meaningless to another language. An anonymous arrow
function has no name, so give a property you store a `databaseKey`.

Replays count as attempts but not toward `examples`, the coverage verdict, or
the health checks, all of which are statements about what the run *explored*.
A `reproduce` run touches the database not at all.

## Shrink costs

The shrinker's default order answers "what is the simplest *input* that
fails". A fault-injecting property usually wants a different question answered
first: "how few *faults* suffice?" Under the default order, turning one
injected fault off is worth exactly as much as making one integer a little
smaller, so the search may keep four faults because the stream around them
happens to be shorter.

`testCase.cost(label, amount = 1)` declares what an example spent:

```ts
if (testCase.boolean(testCase.nextKey("inject", site))) {
  testCase.cost("reorder"); // this example spent one fault
  reorder(queue);
}
```

The shrinker then orders candidates by **total cost first** — a candidate
injecting one fewer fault wins even when its choice stream is longer — with the
ordinary stream order as the tiebreak. A property that never calls `cost`
shrinks exactly as it did before the feature existed. The amount must be
non-negative (a negative one throws `RangeError`; it is a programming error,
not a property failure), and costs accumulate across a whole example,
including anything spent inside [cloned streams](#cloned-streams-advanced).
`failure.costs` reports the per-label breakdown of the example finally
reported.

## Targeted generation

A property records one finite score per label per example, and the run
steers generation toward examples that score higher:

```ts
const value = testCase.integer(0n, 100_000n);
testCase.target(Number(value));
if (value >= 99_990n) throw new Error("overflowed");
```

The run keeps the best-scoring valid example per label and, on a schedule,
hill-climbs its recorded choices — so a failing band at the far end of the
scored quantity is found in a fraction of the examples random search needs.
A failing climb trial shrinks and reports like any other counterexample, and
nothing new enters the blob. Target several quantities with
`testCase.target(score, "depth")` — each label may be observed at most once
per example.

## Structural spans (advanced)

Framework-level code can group choices into labelled ranges so the shrinker can
delete whole semantic units at once:

```ts
testCase.startSpan("stateful.rule");
// ... draws ...
testCase.stopSpan();      // or testCase.stopSpan(true) to discard the span
```

The state-machine runner uses spans for each rule, and `Generators.arrays` uses
one per element, which is why a 40-step failing run shrinks to the three or six
steps that matter and a 30-element list shrinks to the one element that does.
Most tests never call these directly.

## Cloned streams (advanced)

`testCase.cloneStream()` returns a child test case that draws from a stream of
its own. The clone takes one choice position in the parent and is framed
there, so the child's draws neither shift nor are shifted by the parent's:

```ts
const child = testCase.cloneStream();
const value = child.integer(0, 100); // recorded inside the clone entry
```

Everything a run reports belongs to the *family* rather than to one stream:
notes, costs, coverage observations, and the 8,192-choice budget are shared, so
a clone cannot buy a budget of its own and everything it records reaches the
failure report. Clones may nest 100 deep, which is both Hegel's
`MAX_CLONE_DEPTH` and the wire format's own limit; a property that clones past
it has its example rejected rather than failed.

Shrinking descends into a clone rather than treating it as one atomic choice:
each clone's stream is run through the same schedule, with every candidate
spliced back into the parent and replayed through the whole property.

This is the framing and replay seam a concurrent runner would use — today the
child is drawn from inline, on the same thread. On replay, a clone value at
that position hands the child its recorded stream; any other value puns to an
empty child, which overruns on its first draw, so a property that grew a clone
after a blob was written reports an overrun rather than confident, wrong
values.

## Stateful testing

A state machine is any object implementing `Stateful.Machine<M>` — that is,
exposing `rules` and `invariants`, each an array of named entries whose `apply`
receives the machine and the test case:

```ts
import { check, Generators, Stateful, type TestCase } from "@less-than-nothing/zizek";

class Counter implements Stateful.Machine<Counter> {
  private value = 0;

  increment(testCase: TestCase): void {
    this.value += testCase.draw(Generators.integers({ min: 0, max: 10 }));
  }

  nonnegative(): void {
    if (this.value < 0) throw new Error("negative");
  }

  readonly rules: readonly Stateful.Rule<Counter>[] = [
    { name: "increment", apply: (machine, testCase) => machine.increment(testCase) },
  ];

  readonly invariants: readonly Stateful.Invariant<Counter>[] = [
    { name: "nonnegative", apply: (machine) => machine.nonnegative() },
  ];
}

check((testCase) => Stateful.run(new Counter(), testCase));
```

`run` checks every invariant once before the first rule, then takes a capped
number of steps (at most `Stateful.DEFAULT_STEP_COUNT`, 50), picks a rule per
step, and re-checks every invariant after each successful rule. Pass a third
argument to change the cap. A rule that calls `testCase.assume(false)` is
recorded as rejected and skipped without failing the run — a rejected rule
spends an attempt, not a step, so a machine with selective preconditions still
gets its full run.

### Pools

`Stateful.pool<T>(testCase)` holds values produced by earlier rules behind
portable choices, so shrinking and replay stay deterministic even though the
values are arbitrary JavaScript objects:

```ts
const accounts = Stateful.pool<string>(testCase);
accounts.add(testCase, "a");

const account = testCase.draw(accounts.valuesReusable()); // stays in the pool
const ticket = testCase.draw(accounts.valuesConsumed());  // removed from the pool
```

Drawing from an empty pool rejects the current rule attempt (via `assume`), so
rules that need prerequisites simply retry on another step. Selection order is
generated-core semantics: selection by stable identifier.

## Using it from a test runner

`check` is synchronous and reports by throwing, so a property runs inside any
test runner without an adapter — the runner reports the thrown `Failure`, whose
message carries the shrunk example and the reproduce line. With `node:test`:

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

A `split` that drops the remainder fails as:

```text
Expected values to be strictly equal:

0 !== 1

reproduce with: check(property, { reproduce: "AAIAAAAACgEAAAABAAoBAAAAAg==" })
```

Vitest and Jest run the same body unchanged. The property is a plain function,
so a suite can name it and pass it to `check` with a `databaseKey`, a
`reproduce` blob pinned as a regression, or both.

## Health checks

Four checks fail a run early rather than let it look like it tested something:

| Check | Fires when | Suppress with |
|-------|-----------|---------------|
| `filter_too_much` | 50 rejections before 10 valid examples | `suppressFilterTooMuch` |
| `data_too_large` | 20 choice-budget overruns before 10 valid examples | `suppressDataTooLarge` |
| `large_base_example` | the all-simplest input uses more than half the 8,192-choice budget, or overruns | `suppressLargeBaseExample` |
| `too_slow` | generation takes more than one cumulative second in the first ten valid examples | `suppressTooSlow` |

`check` runs the all-simplest input first, as a normal attempt, which is what
`large_base_example` judges. `too_slow` counts monotonic time spent inside
`testCase.draw(...)`, not inside the code under test.

They arrive as `FailedHealthCheck`, whose `check` field carries the name above.
Each is a statement about the *generator*, not the code under test:
`filter_too_much` means the assumptions are doing work the generator should
do, `large_base_example` means even the simplest input is enormous. Suppress
one when you have decided the pattern is intended — a genuinely expensive
generator under `too_slow`, say — not to quiet a signal you have not read.

## What the TypeScript package does not have

- **Asynchronous properties.** `check` is synchronous and rejects a property
  that returns a Promise.
- **Alphabets by Unicode category.** Alphabets are interval sets built with
  `alphabet` and `alphabetRange`; "all letters" is not a built-in.
- **Concurrent clones.** `cloneStream` is the framing and replay seam a
  concurrent runner would use, but this shell draws the child inline.
- **Telling apart two bugs that throw bare strings.** The shrinker keeps the
  failure it found by its origin: the thrown value's constructor plus its
  first stack frame outside Zizek's runner. A thrown string has neither, so two
  such bugs look alike. Throw `Error`s.

## A worked example: splitting a bill

A helper divides a bill, in cents, among a group of people. Rounding down
discards the remainder, so `101` cents between two people comes out as
`[50, 50]`:

```ts
function splitBill(totalCents: number, people: number): number[] {
  const share = Math.floor(totalCents / people);
  return Array.from({ length: people }, () => share);
}
```

The property checks the invariant rather than examples: one share per person,
the shares sum to the total, and no two differ by more than a cent. Taking
the allocator as a parameter runs the same property against more than one
implementation:

```ts
import { check, Failure, Generators, type Property, type TestCase } from "@less-than-nothing/zizek";

type Allocator = (totalCents: number, people: number) => number[];

function allocationProperty(allocate: Allocator): Property {
  return (testCase: TestCase): void => {
    const total = testCase.draw(Generators.integers().minValue(0).maxValue(1_000_000));
    const people = testCase.draw(Generators.integers().minValue(1).maxValue(100));
    const shares = allocate(total, people);
    testCase.note(`allocated ${total} cents among ${people} people as [${shares.join(", ")}]`);

    if (shares.length !== people) throw new Error("wrong number of shares");
    const sum = shares.reduce((left, right) => left + right, 0);
    if (sum !== total) throw new Error("money was lost or created");
    if (Math.max(...shares) - Math.min(...shares) > 1) {
      throw new Error("shares differ by more than one cent");
    }
  };
}

try {
  check(allocationProperty(splitBill), { examples: 500, seed: 23 });
} catch (error) {
  if (!(error instanceof Failure)) throw error;
  console.log(error.message);
}
```

Zizek shrinks the failure to the smallest input that loses money, and the note
shows it:

```text
money was lost or created
reproduce with: check(property, { reproduce: "AAIAAAAACgEAAAABAAoBAAAAAg==" })

Trace:
- allocated 1 cents among 2 people as [0, 0]
```

The blob is portable: the Go, Python, Ruby, and Zig versions of this property
shrink to the byte-identical `AAIAAAAACgEAAAABAAoBAAAAAg==`, so the
counterexample replays in any of them. Distributing the remaining cents one at
a time fixes the allocator, and the same property then passes:

```ts
function splitBillExactly(totalCents: number, people: number): number[] {
  const base = Math.floor(totalCents / people);
  const remainder = totalCents % people;
  return Array.from({ length: people }, (_element, index) => base + (index < remainder ? 1 : 0));
}

check(allocationProperty(splitBillExactly), { examples: 1_000, seed: 23 });
```

The pattern generalizes to taxes, discounts, inventory allocation, pagination,
batching, and other code where edge cases cluster around integer boundaries.

## Runnable examples

Run from `packages/typescript` — Node executes `.ts` directly, so there is no
build step:

| Example | Features | Run |
|---------|----------|-----|
| [`examples/roundtrip.ts`](examples/roundtrip.ts) | text generator, notes, minimal shrinking, blob replay | `node examples/roundtrip.ts` |
| [`examples/tour.ts`](examples/tour.ts) | shrink targets, assumptions, boolean+bytes draws, bounded floats, rejection limits | `node examples/tour.ts` |
| [`examples/queue.ts`](examples/queue.ts) | state machine, rule assumptions, invariants, failure capture, span shrinking | `node examples/queue.ts` |
| [`examples/ledger.ts`](examples/ledger.ts) | full stateful slice: pools, text, cross-language blob fixture | `node examples/ledger.ts` |

Each example is deterministic, asserts its own expected outcome in
`test_zizek.ts`, and prints the shrunk failure with its reproduce blob. The
other language packages ship the same examples, shrinking to identical blobs.

The examples import the package's sources by relative path, so they run from a
checkout of this repository rather than from an installed copy.
