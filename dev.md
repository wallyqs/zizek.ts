# Zizek for TypeScript: development notes

How the package is laid out, built, and checked, for working on it rather
than using it. The [README](README.md) covers installation and the basics, and
[GUIDE.md](GUIDE.md) every feature.

## Core and shell

- `zizek_gen.ts` is generated from ZizekIR and owns deterministic choice
  indexing, boundary candidates, structural rewrites, generation and mutation
  scheduling, stateful step and pool-position rules, serialization, replay,
  and the shrink search's decisions: which request to make next, the
  candidate schedule, the cursor arithmetic, and the accept rule. It is pure —
  plain data in, plain data out, with no module state, randomness, I/O, or
  exceptions. Do not edit it.
- `shell.ts` owns every effect: random exploration, the clock, invoking user
  code, notes, and failure mapping — including deriving the opaque bug-origin
  token (the thrown value's constructor plus its first stack frame outside the
  shell) that the generated accept rule compares. It also drives the search
  and shrink loops, holding their cursors and schedules, and asks the core for
  each decision. That loop is written again in every language package; the
  shared conformance tables are what keep the packages in agreement.
- `generators.ts` contains the generator facades behind `Generators`.
- `stateful.ts` owns host values and invokes user rules and invariants,
  asking the generated core for the step and pool decisions.
- `database.ts` is the example database: the `Database` interface, the
  directory and in-memory backends, and the portable digest.
- `index.ts` is the public module root, and the only module the package's
  `exports` map exposes.
- `node.d.ts` declares the handful of host APIs the shell, the examples, and
  the tests use, so nothing here needs `@types/node`.
- `examples/` holds the runnable examples; `examples/ledger.ts` is the
  end-to-end stateful acceptance example.
- `test_*.ts` are the handwritten suites. The `*_gen_test.ts` files are
  generated from the shared conformance declarations; do not edit them either.

The whole package is written in *erasable* TypeScript (enforced by
`erasableSyntaxOnly`), so Node runs the sources directly by stripping their
types: the suites and examples need no build step.

## The public API boundary

`index.ts` exports exactly the documented API, and `package.json`'s `exports`
map exposes no other module, so the generated core, the shrinker's helpers,
and the RNG cannot be imported from an installed package. Inside `TestCase`,
bookkeeping that the shell, the generators, and the state-machine runner share
is `public` in the source but tagged `@internal`; the build's `stripInternal`
leaves it out of the published declarations, so to a consumer it does not
exist. Members only `TestCase` touches are `private`.

`test_api_visibility.ts` pins the boundary: the names `index.ts` exports, the
`Generators` and `Stateful` namespaces, and the `TestCase` members that are
neither `private` nor `@internal`. White-box tests import what they inspect
from `shell.ts` or `zizek_gen.ts` directly rather than widening `index.ts`; the
generated conformance tests do the same.

## Building the npm package

Node strips types from local `.ts` files but refuses to for anything under
`node_modules`, so the published package cannot ship the sources as they are.
`npm run build` compiles the library modules to `dist/` with
`tsconfig.build.json` — JavaScript, declarations, and `.ts` import specifiers
rewritten to `.js` — and `npm pack` and `npm publish` run it first through
`prepack`. The tarball carries `dist/`, the docs, the logos, and the license;
it ships neither the sources nor the tests and examples.

The compiled output is the same code with the types erased: the target is
ES2022, which every supported Node runs natively, so nothing is down-levelled.

## How the numeric semantics survive JavaScript

The emitter lowers `u64` and `i64` to `bigint` and masks every `u64` result
back to 64 bits, the same way the Python and Ruby targets do. Two JavaScript
specifics are handled in the emitted prelude rather than in the IR:

- An out-of-range `f64` → `u64` conversion saturates, as it does in Rust;
  `BigInt()` would otherwise throw.
- Floats never enter a plain array. V8 canonicalizes a signalling NaN when it
  is stored into a packed double array, which would silently rewrite NaN
  payloads — and the float choice ordering gives every NaN payload its own
  slot. Locals, parameters, returns, and object properties all preserve the
  payload, so the emitted code keeps floats out of arrays and a recorded float
  draw lives in an object field rather than an array slot.

## Verify

From the package root:

```bash
npm run typecheck
npm test
node examples/ledger.ts
npm pack --dry-run
```

`npm test` runs every `test_*.ts`, including each example's pinned shrunk
outcome and blob. The shell and database conformance tests additionally read
shared tables that live in the Zizek source tree and are not shipped with
this package; where the tables are absent, those tests skip and say so. The
Zizek source tree also checks the generated core against golden vectors from
an independent Rust reference, and installs the packed tarball into a scratch
project to check that it imports, type-checks, and runs.

## Example database layout

What is stored is the **raw choice stream**, not the base64 blob, in
`<root>/<key digest>/<stream digest>`, with both digests being the FNV-1a hash
keyed draws already use; `databaseDigest` exposes it. Each key directory also
holds a `.name` file with the property's name, for a human. Writes go to a
temporary file that is renamed into place. An entry that no longer parses is
deleted along with ones that no longer reproduce, and a key directory left
empty is removed.

## Cloned stream framing

A clone takes one choice position in its parent and is framed there as
`[5][u32 child count][children]`, so the child's draws neither shift nor are
shifted by the parent's. Clones nest at most 100 deep, which is both Hegel's
`MAX_CLONE_DEPTH` and the wire format's own limit.

## Examples

- [`examples/roundtrip.ts`](examples/roundtrip.ts) — a text generator, notes,
  minimal shrinking, and blob replay.
- [`examples/tour.ts`](examples/tour.ts) — shrink targets, assumptions,
  boolean and byte draws, bounded floats, and rejection limits.
- [`examples/queue.ts`](examples/queue.ts) — a state machine with rule
  assumptions, invariants, and span shrinking.
- [`examples/ledger.ts`](examples/ledger.ts) — the Hegel ledger port. It
  shrinks the overdraft bug to two account creations and one transfer of `1`,
  and replays a ledger fixture blob that every other language package replays
  too.

Run them from the package root:

```bash
node examples/roundtrip.ts
node examples/tour.ts
node examples/queue.ts
node examples/ledger.ts
```
