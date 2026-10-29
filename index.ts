// Public entry point for the Zizek TypeScript package.
//
// Everything a property, a generator, a state machine, or an example database
// needs is exported here, and nothing else: the generated core, recorded
// draws, the shrinker's helpers, and the RNG are implementation details of the
// modules below. The package's `exports` map exposes only this module.

export {
  alphabet,
  alphabetRange,
  AssumptionRejected,
  check,
  type CheckOptions,
  type Coverage,
  FailedCoverage,
  FailedHealthCheck,
  Failure,
  Flaky,
  type Generator,
  InvalidReplay,
  type IntLike,
  keyHash,
  type Property,
  ReplayOverrun,
  TestCase,
  TooManyRejections,
} from "./shell.ts";

export * as Generators from "./generators.ts";
export * as Stateful from "./stateful.ts";
export {
  databaseDigest,
  type Database,
  type DatabaseOption,
  DEFAULT_DATABASE_PATH,
  DirectoryDatabase,
  InMemoryDatabase,
} from "./database.ts";
