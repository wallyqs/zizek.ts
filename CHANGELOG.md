# Changelog

All notable changes to the TypeScript package are recorded here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project uses [semantic versioning](https://semver.org/spec/v2.0.0.html) —
while the version is `0.x`, the API may change in any release.

## [0.1.0] - 2026-10-28

First release of the TypeScript package, published to npm as
`@less-than-nothing/zizek`.

### Added

- `check` — sequential property exploration with deterministic seeds, which
  throws a shrunk `Failure` carrying a portable reproduce blob.
- Recorded integer, boolean, byte, IEEE-754 float, and Unicode text choices,
  with safe-`number` and exact-`bigint` integer facades, uniform narrow and
  swarm-biased wide integers, and swarm-biased floats.
- `Generators` — composable, immutable generators with options-object and
  fluent-builder spellings: `map`, `filter`, `flatMap`, `oneOf`, `optional`,
  `tuples`, typed `record`, `composite`, and bounded `recursive` trees.
- Variable-length `Generators.arrays` (with `lists` as an alias) whose
  elements shrink by deletion, plus `sets`, `maps`, and `uniqueLists` for
  distinct elements.
- Per-choice shrinking with element-span and rule-span deletion, so a failure
  is reported at its minimal counterexample.
- Portable replay with choice punning and overrun detection, with punned
  draws counted and reported on the failure.
- Keyed draws, shrink costs, targeted generation, and cloned streams.
- Coverage assertions (`always`, `unreachable`, `sometimes`, `cover`, and the
  `require` option) and health checks.
- An example database that stores counterexamples between runs and replays
  them before generating, in a layout the Go, Python, and Ruby packages share.
- `Stateful` — state machines with initial and post-rule invariants,
  rejected-rule handling, notes, and a default budget of 50 successful steps,
  plus reusable and consumed generic pools.
- A `Flaky` failure for a property that fails and then does not fail the same
  way on replay.
- Runnable ledger, queue, roundtrip, and tour examples that shrink to the
  same blobs as the other language packages.

### Notes

- Ships compiled JavaScript with type declarations and has no runtime
  dependencies. Requires Node 22.18 or newer.

[0.1.0]: https://github.com/wallyqs/zizek.ts/releases/tag/v0.1.0
