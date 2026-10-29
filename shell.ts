// The TypeScript runner shell.
//
// Everything that has to be identical across languages — choice encoding,
// shrink-schedule order, replay punning, blob framing — lives in zizek_gen.ts
// and is compiled from ir/. This file only supplies the parts that are
// legitimately per-language: the RNG, invoking the property, mapping a thrown
// value onto an outcome tag, and orchestration.

import * as Core from "./zizek_gen.ts";
import {
  type DatabaseOption,
  resolveDatabase,
  shortlexCompare,
} from "./database.ts";

export class InvalidReplay extends Error {}
export class ReplayOverrun extends Error {}
class ChoiceOverrun extends Error {}
class AsyncPropertyError extends TypeError {}
export class AssumptionRejected extends Error {}

export class FailedHealthCheck extends Error {
  readonly check: string;

  constructor(check: string, message: string) {
    super(message);
    this.check = check;
  }
}

/**
 * A coverage requirement the completed run missed.
 *
 * There is no counterexample and so no blob or shrinking: the failure is the
 * absence of an example, not an example. The counters are a pure function of
 * the run's choice streams, so rerunning with the same seed reproduces the
 * identical verdict.
 */
export class FailedCoverage extends Error {
  readonly label: string;
  readonly observed: number;
  readonly valid: number;
  /**
   * The strongest rate required for the label across its call sites and
   * `require` entries; zero means "at least once".
   */
  readonly minPercent: number;

  constructor(label: string, observed: number, valid: number, minPercent: number) {
    super(
      minPercent === 0
        ? `coverage: "${label}" never held in ${valid} valid examples`
        : `coverage: "${label}" held in ${observed} of ${valid} valid examples, ` +
          `below the required ${minPercent}%`,
    );
    this.label = label;
    this.observed = observed;
    this.valid = valid;
    this.minPercent = minPercent;
  }
}

export class TooManyRejections extends Error {
  readonly rejections: number;
  readonly limit: number;

  constructor(rejections: number, limit: number) {
    super(`too many rejected examples: got ${rejections} rejections (limit ${limit})`);
    this.rejections = rejections;
    this.limit = limit;
  }
}

export class Failure extends Error {
  readonly blob: string;
  readonly propertyCause: unknown;
  readonly examplesRun: number;
  readonly rejections: number;
  readonly notes: readonly string[];
  // Replayed draws that could not use their recorded value. See ir/replay.zir:
  // a pun is legal but silent, so it is counted rather than thrown.
  readonly puns: number;
  // Keyed draws whose name the blob did not carry.
  readonly keyMisses: number;
  // What the reported example spent, per label.
  readonly costs: ReadonlyMap<string, number>;

  constructor(
    blob: string,
    propertyCause: unknown,
    examplesRun: number,
    rejections = 0,
    notes: readonly string[] = [],
    puns = 0,
    keyMisses = 0,
    costs: ReadonlyMap<string, number> = new Map(),
  ) {
    let message = `${describe(propertyCause)}\n` +
      `reproduce with: check(property, { reproduce: ${JSON.stringify(blob)} })`;
    if (keyMisses !== 0) {
      const noun = keyMisses === 1 ? "draw was" : "draws were";
      message += `\nwarning: ${keyMisses} keyed ${noun} not in this blob and ` +
        "used the simplest value instead";
    }
    if (puns !== 0) {
      // The values reported above are not the ones the blob recorded. Say so:
      // a punned replay is a different run wearing the same blob.
      const noun = puns === 1 ? "choice" : "choices";
      message += `\nwarning: ${puns} replayed ${noun} did not fit this property ` +
        "and fell back to a default; the example above is not the one the blob recorded";
    }
    if (notes.length > 0) {
      message += `\n\nTrace:\n- ${notes.join("\n- ")}`;
    }
    super(message, { cause: propertyCause });
    this.blob = blob;
    this.propertyCause = propertyCause;
    this.examplesRun = examplesRun;
    this.rejections = rejections;
    this.notes = Object.freeze([...notes]);
    this.puns = puns;
    this.keyMisses = keyMisses;
    this.costs = new Map(costs);
  }
}

/**
 * A failing example did not fail the same way when it was replayed: the
 * property depends on something other than the choices it drew. There is no
 * shrunk example to trust, so this carries the failure as first found and the
 * blob of the stream that produced it. Unlike a {@link Failure}'s, that blob
 * need not fail when reproduced.
 */
export class Flaky extends Error {
  readonly blob: string;
  readonly propertyCause: unknown;
  readonly examplesRun: number;
  readonly rejections: number;

  constructor(blob: string, propertyCause: unknown, examplesRun: number, rejections = 0) {
    super(
      "flaky test: the property failed, then did not fail the same way when that " +
        `example was replayed\noriginal failure: ${describe(propertyCause)}\n` +
        `reproduce with: check(property, { reproduce: ${JSON.stringify(blob)} })`,
      { cause: propertyCause },
    );
    this.blob = blob;
    this.propertyCause = propertyCause;
    this.examplesRun = examplesRun;
    this.rejections = rejections;
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---------- bytes ----------

export function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

// Hoisted: keyEncode reaches for it once per keyed draw.
const ENCODER = new TextEncoder();

/**
 * The bytes of an ASCII transport string — a base64 reproduce blob, or any
 * other string the wire format defines as ASCII.
 *
 * This is not a text encoder. It reads one byte per UTF-16 code unit, so a
 * character outside ASCII is either truncated (U+00E9 becomes one byte, not
 * the two UTF-8 spells it as) or split into its surrogates. That is correct
 * for base64 and wrong for anything a user names, which is why hashing a draw
 * name goes through `utf8Bytes` instead.
 */
export function asciiBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/**
 * The UTF-8 bytes of a string.
 *
 * Every other Zizek package hashes a name as its UTF-8 bytes — Go's
 * `[]byte(s)`, Python's `.encode("utf-8")`, Ruby's `.b`, Rust's `as_bytes`,
 * Java's `getBytes(UTF_8)`. JavaScript has no such default: a string is UTF-16
 * code units, and every conversion to bytes is a choice. This is the one that
 * makes a key hashed here equal to the same key hashed anywhere else.
 */
export function utf8Bytes(text: string): Uint8Array {
  return ENCODER.encode(text);
}

/**
 * The default text alphabet: every Unicode scalar value, as Hypothesis uses.
 * Generation is biased towards the simple end of the shrink order, so most
 * drawn characters are still ASCII (see ir/generation.zir).
 */
export const UNICODE: Uint8Array = Core.alphabetRange(0n, 0x10ffffn);

/**
 * The alphabet holding exactly these characters.
 *
 * Alphabets are interval sets, canonical by construction: the order the
 * characters are written in and any repeats among them do not change the
 * result, so alphabet("cab") and alphabet("abc") are the same alphabet and
 * index their members identically.
 */
export function alphabet(characters: string): Uint8Array {
  let encoded: Uint8Array = new Uint8Array(new ArrayBuffer(0));
  for (const character of characters) {
    const codepoint = BigInt(character.codePointAt(0)!);
    if (!Core.alphabetCodepointAllowed(codepoint)) {
      throw new RangeError(`${character} cannot be an alphabet member`);
    }
    encoded = Core.alphabetInsert(encoded, codepoint);
  }
  return encoded;
}

/**
 * The alphabet holding every scalar value in a codepoint range. Surrogates are
 * not scalar values and are dropped from the range rather than rejected, so
 * alphabetRange(0, 0x10FFFF) is the whole of Unicode.
 */
export function alphabetRange(minCodepoint: IntLike, maxCodepoint: IntLike): Uint8Array {
  return Core.alphabetRange(big(minCodepoint), big(maxCodepoint));
}

/** Packed u32-LE codepoints as a native string. */
export function unpackCodepoints(packed: Uint8Array): string {
  let out = "";
  for (let at = 0; at + 4 <= packed.length; at += 4) {
    out += String.fromCodePoint(
      packed[at] | (packed[at + 1] << 8) | (packed[at + 2] << 16) | (packed[at + 3] << 24),
    );
  }
  return out;
}

// Minimal two's-complement little-endian bytes — the width the generated core
// treats as canonical for a signed integer choice.
export function signedBytes(value: bigint): Uint8Array {
  let width = 1;
  while (!(value >= -(1n << BigInt(width * 8 - 1)) && value < 1n << BigInt(width * 8 - 1))) {
    width++;
  }
  const unsigned = value < 0n ? (1n << BigInt(width * 8)) + value : value;
  const out = new Uint8Array(width);
  for (let i = 0; i < width; i++) {
    out[i] = Number((unsigned >> BigInt(i * 8)) & 0xffn);
  }
  return out;
}

export function signedInt(value: Uint8Array): bigint {
  if (value.length === 0) return 0n;
  let unsigned = 0n;
  for (let i = 0; i < value.length; i++) {
    unsigned |= BigInt(value[i]) << BigInt(i * 8);
  }
  return value[value.length - 1] >= 0x80
    ? unsigned - (1n << BigInt(value.length * 8))
    : unsigned;
}

// ---------- rng ----------

// splitmix64: small, seedable, and good enough for exploration. Reproducibility
// is carried by the recorded choices, never by this stream, so it deliberately
// does not have to match any other package's generator.
export class Rng {
  private state: bigint;

  constructor(seed: bigint | number) {
    this.state = BigInt.asUintN(64, BigInt(seed));
  }

  nextU64(): bigint {
    this.state = BigInt.asUintN(64, this.state + 0x9e3779b97f4a7c15n);
    let z = this.state;
    z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n);
    z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94d049bb133111ebn);
    return z ^ (z >> 31n);
  }

  // Uniform in [0, bound) for any positive bound, by rejection sampling over
  // whole 64-bit words so wide integer ranges stay unbiased.
  below(bound: bigint): bigint {
    if (bound <= 0n) throw new RangeError("bound must be positive");
    let words = 1;
    while (1n << BigInt(words * 64) < bound) words++;
    const span = 1n << BigInt(words * 64);
    const limit = span - (span % bound);
    for (;;) {
      let value = 0n;
      for (let i = 0; i < words; i++) value = (value << 64n) | this.nextU64();
      if (value < limit) return value % bound;
    }
  }

  between(minimum: bigint, maximum: bigint): bigint {
    return minimum + this.below(maximum - minimum + 1n);
  }

  bytes(length: number): Uint8Array {
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i += 8) {
      let word = this.nextU64();
      for (let j = i; j < Math.min(i + 8, length); j++) {
        out[j] = Number(word & 0xffn);
        word >>= 8n;
      }
    }
    return out;
  }
}

// ---------- test cases ----------

// `key` is the hash of a draw's name, or null when it is addressed by
// position. `encoded` stays the inner entry either way, so indexing,
// shrinking, and replay resolution never have to know about keys.
export type Draw =
  | {
    // The stream a clone draw carries. Its entry is built at serialization
    // time rather than at record time, because the child keeps drawing after
    // the clone is recorded.
    kind: "clone";
    encoded: Uint8Array;
    value: null;
    params: readonly [];
    forced: boolean;
    key: bigint | null;
    child: TestCase;
  }
  | {
    kind: "integer";
    encoded: Uint8Array;
    value: bigint;
    params: readonly [bigint, bigint, bigint];
    forced: boolean;
    key: bigint | null;
  }
  | {
    kind: "boolean";
    encoded: Uint8Array;
    value: boolean;
    params: readonly [];
    forced: boolean;
    key: bigint | null;
  }
  | {
    kind: "bytes";
    encoded: Uint8Array;
    value: Uint8Array;
    params: readonly [bigint, bigint];
    forced: boolean;
    key: bigint | null;
  }
  | {
    /** `value` holds the packed u32-LE codepoints the stream records. */
    kind: "string";
    encoded: Uint8Array;
    value: Uint8Array;
    params: readonly [Uint8Array, bigint, bigint];
    forced: boolean;
    key: bigint | null;
  }
  | {
    kind: "float";
    encoded: Uint8Array;
    value: number;
    params: FloatSpec;
    forced: boolean;
    key: bigint | null;
  };

/** minimum, maximum, allowNan, allowInfinity, smallestNonzeroMagnitude. */
export type FloatSpec = readonly [number, number, boolean, boolean, number];

export interface ChoiceSpan {
  start: number;
  finish: number;
  label: string;
  depth: number;
  parent: number | null;
  discarded: boolean;
}

export interface Generator<T> {
  doDraw(testCase: TestCase): T;
}

/** Bounds accept a plain number for readability; values are always exact. */
export type IntLike = bigint | number;

function big(value: IntLike): bigint {
  return typeof value === "bigint" ? value : BigInt(value);
}

// Array.prototype.sort compares stringified elements by default, which orders
// identifiers lexicographically — "10" before "9". Both identifier draws depend
// on ascending numeric order, so every sort of them passes this.
function compareIds(left: bigint, right: bigint): number {
  if (left < right) return -1;
  return left > right ? 1 : 0;
}

// One more than the largest identifier the family has ever drawn, or zero
// before the first draw. Both identifier windows are anchored on this.
function identifierBound(used: ReadonlySet<bigint>): bigint {
  let bound = 0n;
  for (const id of used) {
    const next = id + 1n;
    if (next > bound) bound = next;
  }
  return bound;
}

// What a rejected element costs a unique collection. Defined by
// ir/many.zir::many_reject_action.
const REJECT_RETRY = 0n;
const REJECT_STOP = 1n;
const REJECT_INVALID = 2n;

/**
 * How deeply clones may nest. This is Hegel's MAX_CLONE_DEPTH and the wire
 * format's own limit (ir/wire.zir @choice_entry_end): a stream nested deeper
 * than this cannot be validated, so refusing to build one keeps the shell from
 * emitting a blob nothing can read.
 */
export const MAX_CLONE_DEPTH = 100;

export class TestCase {
  /** @internal */
  readonly draws: Draw[] = [];
  /**
   * The stream this one was cloned from; null for the case the property was
   * handed. Everything a run reports — notes, costs, coverage, puns, the
   * choice budget — belongs to the family rather than to one stream, so those
   * route through root().
   */
  private readonly parent: TestCase | null;
  /**
   * Every draw in the family, including those inside clones. Kept on the root
   * so the choice budget stays O(1) per draw.
   */
  private flatDraws = 0n;
  private integerSwarm: bigint | null = null;
  private floatSwarm: bigint | null = null;
  /** @internal */
  readonly spans: ChoiceSpan[] = [];
  /** @internal */
  readonly notes: string[] = [];

  private readonly rng: Rng | null;
  private replay: Uint8Array | null;
  private readonly simplest: boolean;
  private position = 4n;
  private remaining: bigint;
  private readonly spanStack: number[] = [];
  private generationDepth = 0;
  private generationMicros = 0n;
  // Replayed draws that could not use their recorded value; see ir/replay.zir.
  /** @internal */
  puns = 0;
  // Identifiers handed out by freshId, family-wide so an identifier is unique
  // across every stream of the case. Only ever grows: that is what keeps the
  // recorded windows monotone within a run, so consuming a value cannot
  // destabilize the identifiers recorded after it.
  private readonly freshIds = new Set<bigint>();
  // Keyed draws whose name the stream did not carry. Like a pun this is a
  // silent substitution — the draw falls back to its simplest value — so it is
  // counted rather than thrown.
  /** @internal */
  keyMisses = 0;
  private keyed: Map<bigint, number[]> | null = null;
  // Per-name ordinals for nextKey. Execution-local by construction: a counter
  // that outlives one example produces different keys on the replay than on the
  // run that recorded it, and every draw misses.
  private readonly keyCounts = new Map<string, number>();
  // What this example spent, per label. The shrinker minimizes the total ahead
  // of the choice stream.
  /** @internal */
  readonly costs = new Map<string, number>();
  // Targeting observations for this example, per label. The run keeps the
  // best-scoring example per label and hill-climbs it on a schedule.
  /** @internal */
  readonly targets = new Map<string, number>();
  // Coverage observations buffered for this example, in first-observation
  // order. check() commits them into its run-level counters only when the
  // example turns out valid, so a rejected or overrun example contributes
  // nothing — the same convention discarded draws follow.
  /** @internal */
  readonly coverage = new Map<string, { held: boolean; permille: number }>();

  /**
   * Record that this example spent something scarce.
   *
   * The shrinker orders candidates by total cost first and by the choice stream
   * second, so a candidate injecting one fewer fault wins even when its stream
   * is longer. A property that never calls this is ordered as before.
   */
  cost(label: string, amount = 1): void {
    if (amount < 0) throw new RangeError("cost amount must be >= 0");
    const family = this.root();
    family.costs.set(label, (family.costs.get(label) ?? 0) + amount);
  }

  /** @internal */
  totalCost(): bigint {
    let total = 0;
    for (const amount of this.root().costs.values()) total += amount;
    return BigInt(total);
  }

  /**
   * Record a targeting observation: generation is steered towards examples
   * that maximize the score.
   *
   * The run keeps, per label, the best-scoring valid example, and hill-climbs
   * those examples on a schedule between ordinary generation. The score must
   * be finite, and each label may be observed at most once per example — a
   * property targeting several quantities names them apart.
   */
  target(score: number, label = ""): void {
    if (!Number.isFinite(score)) {
      throw new RangeError(
        `target(${score}, ${JSON.stringify(label)}) requires a finite score`,
      );
    }
    const family = this.root();
    if (family.targets.has(label)) {
      throw new RangeError(
        `target(${score}, ${JSON.stringify(label)}) would overwrite an ` +
          "earlier observation; each label can be observed at most once per example",
      );
    }
    family.targets.set(label, score);
  }

  /**
   * The key naming the next draw in a sequence.
   *
   * Appends an ordinal counted *within this name*, so `nextKey("read", conn)`
   * numbers that connection's reads independently of every other sequence. An
   * insertion then shifts only its own sequence.
   */
  nextKey(...components: readonly (string | number | bigint)[]): bigint {
    const scope = keyEncode(components);
    const seen = String.fromCharCode(...scope);
    const ordinal = this.keyCounts.get(seen) ?? 0;
    this.keyCounts.set(seen, ordinal + 1);
    return Core.keyHash(Core.keyAppendInt(scope, signedBytes(BigInt(ordinal))));
  }

  constructor(
    options: {
      rng?: Rng;
      replay?: Uint8Array;
      simplest?: boolean;
      parent?: TestCase;
    } = {},
  ) {
    this.rng = options.rng ?? null;
    this.replay = options.replay ?? null;
    this.simplest = options.simplest ?? false;
    this.parent = options.parent ?? null;
    this.remaining = this.replay === null ? 0n : Core.choiceStreamCount(this.replay);
  }

  /**
   * The case the property was handed: the family every clone belongs to.
   *
   * @internal
   */
  root(): TestCase {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let at: TestCase = this;
    while (at.parent !== null) at = at.parent;
    return at;
  }

  /** How many clones deep this stream sits. */
  private depth(): number {
    let levels = 0;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let at: TestCase = this;
    while (at.parent !== null) {
      levels += 1;
      at = at.parent;
    }
    return levels;
  }

  /** Append a draw and count it against the family's choice budget. */
  private record(draw: Draw): void {
    this.draws.push(draw);
    this.root().flatDraws += 1n;
  }

  /**
   * A child test case that draws from a stream of its own.
   *
   * The clone occupies one choice position in this stream and gets its own
   * prefix, RNG, and span structure, so its draws neither shift nor are
   * shifted by the parent's — which is what makes it the seam a concurrent
   * runner would use. Everything the run reports is shared: notes, costs,
   * coverage, and the choice budget all belong to the family.
   *
   * This is Hegel's hegel_test_case_clone without threads. The child is drawn
   * from sequentially, but the wire framing (`[5][u32 child count][children]`)
   * and the replay rules are the engine's, so a blob carrying a clone crosses
   * between the two.
   *
   * On replay a clone value at this position hands the child its recorded
   * stream. Any other value puns to an empty child, which overruns on its
   * first draw in a bare replay and extends randomly under a probe.
   */
  cloneStream(): TestCase {
    this.checkChoiceBudget();
    if (this.depth() + 1 > MAX_CLONE_DEPTH) {
      // Upstream concludes the family invalid here rather than failing the
      // property, so this is a rejection: a false assume's path.
      throw new AssumptionRejected();
    }
    const [at, useSimplest] = this.resolve("clone", null);
    let child: TestCase;
    if (useSimplest) {
      child = new TestCase({ parent: this, simplest: true });
    } else if (this.replay === null) {
      child = new TestCase({ parent: this, rng: spawnRng(this.rng) });
    } else {
      let inner = Core.cloneInnerStream(this.replay, at!);
      if (inner === null) {
        // A non-clone entry where a clone belongs: pun to an empty child.
        this.root().puns++;
        inner = Core.choiceListHeader(0n);
      }
      child = new TestCase({ parent: this, replay: inner, rng: spawnRng(this.rng) });
    }
    this.record({
      kind: "clone",
      encoded: new Uint8Array(0),
      value: null,
      params: [],
      forced: false,
      key: null,
      child,
    });
    return child;
  }

  // Generation and the simplest probe record protocol 3. The probe used to
  // record the legacy protocol, whose stream the sniffer reads back as
  // protocol 2 whenever the first rule's first draw is an integer, so its
  // failures did not replay.
  /** @internal */
  statefulProtocol(): bigint {
    return this.replay === null ? 3n : Core.statefulChoiceProtocol(this.replay, this.position, this.remaining);
  }

  /** @internal */
  statefulFeatureProbabilityRaw(generated: bigint): bigint {
    return this.replay === null ? this.forcedInteger(generated) : this.integer(0, 254);
  }

  assume(condition: boolean): void {
    if (!condition) throw new AssumptionRejected("assumption rejected");
  }

  /**
   * Assert that condition holds every time this call site runs.
   *
   * A false condition fails the current example — an ordinary property failure
   * that shrinks and replays like any other, with this call site as the bug's
   * origin. A passing evaluation also counts as covering `label`, so a call
   * site that may legitimately never execute is fine on its own ("always or
   * unreachable"), while listing the label in the `require` option
   * additionally fails a run that never reached it.
   */
  always(label: string, condition: boolean): void {
    if (!condition) throw new Error(`always: "${label}" did not hold`);
    this.cover(label, true);
  }

  /**
   * Fail the current example: the assertion is that no example reaches this
   * call site. The failure shrinks and replays like any other, so the reported
   * counterexample is the simplest input that reaches the branch.
   */
  unreachable(label: string): void {
    throw new Error(`unreachable: "${label}" was reached`);
  }

  /**
   * Assert that condition holds in at least one valid example of the run.
   *
   * A property passes vacuously when the branch it exists to test never
   * executes; sometimes turns that silent gap into a failure. The verdict is
   * per run, not per example, so a false condition here never fails the
   * current example — only a completed run in which it never held.
   */
  sometimes(label: string, condition: boolean): void {
    this.cover(label, condition);
  }

  /**
   * Assert that condition holds in at least percent% of valid examples — and
   * at least once, whatever the rate. A label counts once per example in which
   * its condition held, however many times the call site ran. Labels a run
   * must observe even when the call site itself may never execute are declared
   * up front via the `require` option.
   */
  cover(label: string, condition: boolean, options: { percent?: number } = {}): void {
    const percent = options.percent ?? 0;
    if (!(percent >= 0 && percent <= 100)) {
      throw new RangeError("cover percent must be between 0 and 100");
    }
    const observation = this.coverage.get(label) ?? { held: false, permille: 0 };
    observation.held ||= condition;
    observation.permille = Math.max(observation.permille, Math.trunc(percent * 10));
    this.coverage.set(label, observation);
  }

  draw<T>(generator: Generator<T>): T {
    const outer = this.generationDepth === 0;
    this.generationDepth++;
    const started = outer ? process.hrtime.bigint() : 0n;
    try {
      return generator.doDraw(this);
    } finally {
      this.generationDepth--;
      if (outer) {
        const elapsed = (process.hrtime.bigint() - started) / 1000n;
        const maximum = (1n << 64n) - 1n;
        this.generationMicros = this.generationMicros > maximum - elapsed
          ? maximum
          : this.generationMicros + elapsed;
      }
    }
  }

  /** @internal */
  generationTimeMicros(): bigint {
    return this.generationMicros;
  }

  note(message: string): void {
    this.root().notes.push(message);
  }

  startSpan(label: string): number {
    const parent = this.spanStack.length === 0
      ? null
      : this.spanStack[this.spanStack.length - 1];
    const spanId = this.spans.length;
    this.spans.push({
      start: this.draws.length,
      finish: this.draws.length,
      label,
      depth: this.spanStack.length,
      parent,
      discarded: false,
    });
    this.spanStack.push(spanId);
    return spanId;
  }

  stopSpan(discarded = false): void {
    const spanId = this.spanStack.pop();
    if (spanId === undefined) return;
    const span = this.spans[spanId];
    span.finish = this.draws.length;
    span.discarded = discarded;
  }

  /** @internal */
  openSpanDepth(): number {
    return this.spanStack.length;
  }

  /** @internal */
  resetOpenSpansTo(depth: number, discarded = true): void {
    while (this.spanStack.length > depth) this.stopSpan(discarded);
  }

  /** @internal */
  closeOpenSpans(): void {
    while (this.spanStack.length > 0) this.stopSpan();
    // A clone has its own span structure, and the property may leave one open
    // on a child exactly as it may on the stream it was handed.
    for (const draw of this.draws) {
      if (draw.kind === "clone") draw.child.closeOpenSpans();
    }
  }

  private checkChoiceBudget(): void {
    if (this.remaining === 0n && this.rng !== null) this.replay = null;
    // The budget belongs to the family, not to one stream: upstream's cap is on
    // the whole pieced-together choice sequence, so a clone cannot buy another
    // 8,192 draws by starting a stream of its own.
    if (this.replay === null && Core.choiceBudgetExhausted(this.root().flatDraws)) {
      throw new ChoiceOverrun("generated example exceeded the choice budget");
    }
  }

  integer(
    minimum: IntLike,
    maximum: IntLike,
    shrinkTowards: IntLike = 0,
    key: bigint | null = null,
    uniform = false,
  ): bigint {
    const low = big(minimum);
    const high = big(maximum);
    const target = big(shrinkTowards);
    if (low > high) throw new RangeError("minimum must be <= maximum");
    this.checkChoiceBudget();

    const [at, useSimplest] = this.resolve("integer", key);
    let value: bigint;
    if (useSimplest) {
      value = signedInt(Core.integerSimplest(
        signedBytes(low),
        signedBytes(high),
        signedBytes(target),
      ));
    } else if (this.replay === null) {
      const rng = this.requireRng();
      if (!uniform && Core.integerSwarmIsWide(low, high)) {
        const count = Core.integerBoundaryCount(low, high);
        const family = this.root();
        if (family.integerSwarm === null) family.integerSwarm = rng.below(1n << 64n);
        const category = Core.integerSwarmCategory(family.integerSwarm, rng.below(1000n));
        let candidate: bigint | null = null;
        if (category === 0n) {
          candidate = Core.integerSwarmEndpointCandidate(low, high, rng.below(4n));
        } else if (category === 1n && count > 2n) {
          candidate = Core.integerBoundaryCandidate(low, high, 2n + rng.below(count - 2n));
        } else if (category === 2n) {
          candidate = Core.integerSwarmDiffuseCandidate(
            low, high, rng.below(Core.integerSwarmDiffuseCount()),
          );
        }
        value = candidate ?? rng.between(low, high);
      } else {
        // Narrow ranges are uniform: a boundary boost here over-picked the
        // ends of small ranges, i.e. the first and last option of a list
        // indexed by this draw.
        value = rng.between(low, high);
      }
    } else {
      const lowBytes = signedBytes(low);
      const highBytes = signedBytes(high);
      if (Core.replayIntegerPuns(this.replay, at!, lowBytes, highBytes)) this.root().puns++;
      value = signedInt(
        Core.replayInteger(this.replay, at!, lowBytes, highBytes, signedBytes(target)),
      );
    }

    this.record({
      kind: "integer",
      encoded: Core.serializeIntegerChoice(signedBytes(value)),
      value,
      params: [low, high, target],
      forced: false,
      key,
    });
    return value;
  }

  boolean(key: bigint | null = null): boolean {
    this.checkChoiceBudget();
    const [at, useSimplest] = this.resolve("boolean", key);
    let value: boolean;
    if (useSimplest) {
      value = false;
    } else if (this.replay === null) {
      value = this.requireRng().below(2n) === 1n;
    } else {
      if (Core.replayBooleanPuns(this.replay, at!)) this.root().puns++;
      value = Core.replayBoolean(this.replay, at!);
    }
    this.record({
      kind: "boolean",
      encoded: Core.serializeBooleanChoice(value),
      value,
      params: [],
      forced: false,
      key,
    });
    return value;
  }

  /**
   * Record one identifier choice: an integer in `[0, windowHi]`.
   *
   * Identifier draws differ from `integer` only in how a replayed value is
   * resolved — an ordinary integer puns to the nearest legal value, while an
   * identifier is *repaired* onto one the pool still holds — so what reaches
   * the stream is an ordinary integer entry and nothing downstream (the wire
   * format, the shrinker, the indexers) has to know these exist. The repaired
   * value is what gets recorded, which is what lets a replayed stream heal
   * rather than drift.
   */
  private drawIdentifier(
    windowHi: bigint,
    simplestValue: bigint,
    generate: () => bigint,
    repair: (raw: bigint) => bigint,
  ): bigint {
    this.checkChoiceBudget();
    const [at, useSimplest] = this.resolve("integer", null);
    let value: bigint;
    if (useSimplest) {
      value = simplestValue;
    } else if (this.replay === null) {
      value = generate();
    } else {
      const lowBytes = signedBytes(0n);
      const highBytes = signedBytes(windowHi);
      // A recorded value outside the window is *punned*, not repaired. Repair
      // is for a value that named a member which has since gone, and it slides
      // towards an earlier one; a value that was never in the window names
      // nothing, so it falls back to the simplest member the way every other
      // out-of-range replay value does. Reading `replayInteger` first would
      // lose the distinction — it clamps to the window, which would send a
      // runaway value to the *largest* member rather than the smallest.
      if (Core.replayIntegerPuns(this.replay, at!, lowBytes, highBytes)) {
        this.root().puns++;
        value = simplestValue;
      } else {
        value = repair(signedInt(
          Core.replayInteger(this.replay, at!, lowBytes, highBytes, signedBytes(0n)),
        ));
      }
    }

    this.record({
      kind: "integer",
      encoded: Core.serializeIntegerChoice(signedBytes(value)),
      value,
      params: [0n, windowHi, 0n],
      forced: false,
      key: null,
    });
    return value;
  }

  /**
   * Draw an identifier that is arbitrary but unique within this family.
   *
   * The identifier is recorded *by value*, so it keeps meaning the same
   * variable when unrelated earlier draws are deleted during shrinking — which
   * is the whole point of it, and what a positional index cannot do. Generation
   * always hands out the smallest unused identifier, and a replayed identifier
   * that is already in use is repaired to that same smallest unused one.
   *
   * This is Hegel's `draw_fresh_id` (`hegel-c` 0.32.4).
   *
   * @internal
   */
  freshId(): bigint {
    const used = this.root().freshIds;
    const windowHi = Core.statefulFreshIdWindow(identifierBound(used));
    let fallback = 0n;
    for (const usedId of [...used].sort(compareIds)) {
      fallback = Core.statefulFreshIdFallbackStep(fallback, usedId);
    }

    const value = this.drawIdentifier(
      windowHi,
      fallback,
      () => fallback,
      (raw) =>
        Core.statefulFreshIdAccepts(raw, windowHi, used.has(raw)) ? raw : fallback,
    );
    used.add(value);
    return value;
  }

  /**
   * Draw one of `members`, recording the member itself.
   *
   * Recording the member rather than an index into the live set is what makes a
   * reference survive the deletion of *other* members: while the member it
   * names is still there it keeps naming it, and when that member goes the
   * reference slides to an earlier one rather than to whatever now occupies
   * some shifted position.
   *
   * This is Hegel's `draw_from_set` (`hegel-c` 0.32.4).
   *
   * @internal
   */
  fromSet(members: readonly bigint[]): bigint {
    if (members.length === 0) {
      throw new RangeError("fromSet requires at least one member");
    }
    const ordered = [...new Set(members)].sort(compareIds);
    const smallest = ordered[0];
    if (smallest < 0n) throw new RangeError("fromSet requires nonnegative members");
    const used = this.root().freshIds;
    const windowHi = Core.statefulSetChoiceWindow(identifierBound(used));

    const repair = (raw: bigint): bigint => {
      if (!Core.statefulSetChoiceAccepts(raw, windowHi)) return smallest;
      let best = smallest;
      for (const candidate of ordered) {
        if (Core.statefulSetChoiceBetter(candidate, raw, best)) best = candidate;
      }
      return best;
    };

    return this.drawIdentifier(
      windowHi,
      smallest,
      () => ordered[Number(this.requireRng().below(BigInt(ordered.length)))],
      repair,
    );
  }

  // Recorded as an ordinary boolean choice: the weight biases generation only,
  // so a blob replays the same whatever probability produced it.
  weighted(probability: number, key: bigint | null = null): boolean {
    this.checkChoiceBudget();
    const [at, useSimplest] = this.resolve("boolean", key);
    let value: boolean;
    if (useSimplest) {
      value = false;
    } else if (this.replay === null) {
      const scale = 1n << 53n;
      value = Number(this.requireRng().below(scale)) / Number(scale) < probability;
    } else {
      if (Core.replayBooleanPuns(this.replay, at!)) this.root().puns++;
      value = Core.replayBoolean(this.replay, at!);
    }
    this.record({
      kind: "boolean",
      encoded: Core.serializeBooleanChoice(value),
      value,
      params: [],
      forced: false,
      key: null,
    });
    return value;
  }

  // Draw a variable-length sequence of values from one generator.
  //
  // The length is never a choice of its own. Each iteration draws a single
  // "another element?" boolean inside a span that also holds that element's
  // own choices, which is what makes a collection structurally shrinkable:
  // deleting the span removes exactly one element and leaves the rest of the
  // stream framed correctly. Truncation falls out of the same shape — lowering
  // one of those booleans to false ends the sequence there.
  //
  // The decision itself lives in the core (ir/many.zir); this loop only
  // supplies entropy and records spans.
  /** @internal */
  collect<T>(
    element: Generator<T>,
    minSize = 0,
    maxSize: number | null = null,
    label = "collection.element",
  ): T[] {
    if (minSize < 0) throw new RangeError("minSize must be >= 0");
    const hasMax = maxSize !== null;
    const bound = hasMax ? maxSize : 0;
    if (hasMax && bound < minSize) throw new RangeError("maxSize must be >= minSize");
    const low = BigInt(minSize);
    const high = BigInt(bound);
    const probability = Core.lengthPContinue(low, high, hasMax);
    const drawsChoice = Core.manyDrawsChoice(low, high, hasMax);
    const values: T[] = [];
    for (;;) {
      this.startSpan(label);
      const forced = Core.manyForcedValue(
        false,
        BigInt(values.length),
        low,
        high,
        hasMax,
        probability,
      );
      let more: boolean;
      if (!drawsChoice) {
        // Bounds coincide: upstream draws nothing at all here.
        more = values.length < minSize;
      } else if (forced === null) {
        more = this.weighted(probability);
      } else {
        more = this.forcedBoolean(forced);
      }
      if (!more) {
        this.stopSpan(true);
        return values;
      }
      // An open span is closed for us when the execution unwinds.
      values.push(this.draw(element));
      this.stopSpan(false);
    }
  }

  // Draw a variable-length sequence whose elements are all distinct under key.
  //
  // Same pacing as collect, with one extra decision layered on: what a
  // duplicate costs. Upstream spells a unique collection as a *filtered* element
  // draw inside the same "another element?" loop, so this does too. Each element
  // gets up to filterRetryAllowed candidates, each in its own span that is
  // discarded when the candidate is already present — the choices stay in the
  // stream, so a replay walks the same positions, but the shrinker may delete
  // them freely.
  //
  // When every candidate for one element is a duplicate the *element* is
  // rejected rather than the example, and manyRejectAction decides what that
  // costs: retry, stop the collection where it is, or — when the collection
  // cannot reach its own minSize — reject the example the way a failed
  // assumption does. Both rules live in ir/many.zir.
  /** @internal */
  collectUnique<T, K>(
    element: Generator<T>,
    key: ((value: T) => K) | null = null,
    minSize = 0,
    maxSize: number | null = null,
    label = "collection.element",
  ): T[] {
    if (minSize < 0) throw new RangeError("minSize must be >= 0");
    const hasMax = maxSize !== null;
    const bound = hasMax ? maxSize : 0;
    if (hasMax && bound < minSize) throw new RangeError("maxSize must be >= minSize");
    const low = BigInt(minSize);
    const high = BigInt(bound);
    const probability = Core.lengthPContinue(low, high, hasMax);
    const drawsChoice = Core.manyDrawsChoice(low, high, hasMax);
    const values: T[] = [];
    const seen = new Set<unknown>();
    let rejections = 0n;
    let forceStop = false;
    for (;;) {
      this.startSpan(label);
      const forced = Core.manyForcedValue(
        forceStop,
        BigInt(values.length),
        low,
        high,
        hasMax,
        probability,
      );
      let more: boolean;
      if (!drawsChoice) {
        // Bounds coincide: upstream draws nothing at all here.
        more = values.length < minSize;
      } else if (forced === null) {
        more = this.weighted(probability);
      } else {
        more = this.forcedBoolean(forced);
      }
      if (!more) {
        this.stopSpan(true);
        return values;
      }
      let accepted: { value: T; fingerprint: unknown } | null = null;
      let attempts = 0n;
      while (accepted === null && Core.filterRetryAllowed(attempts)) {
        this.startSpan("collection.candidate");
        // An open span is closed for us when the execution unwinds.
        const candidate = this.draw(element);
        attempts += 1n;
        const fingerprint: unknown = key === null ? candidate : key(candidate);
        if (seen.has(fingerprint)) {
          this.stopSpan(true);
          continue;
        }
        this.stopSpan(false);
        accepted = { value: candidate, fingerprint };
      }
      if (accepted === null) {
        this.stopSpan(true);
        rejections += 1n;
        const action = Core.manyRejectAction(
          rejections,
          BigInt(values.length),
          low,
        );
        if (action === REJECT_INVALID) this.assume(false);
        if (action === REJECT_STOP) forceStop = true;
        continue;
      }
      seen.add(accepted.fingerprint);
      values.push(accepted.value);
      this.stopSpan(false);
    }
  }

  bytes(
    minimum: IntLike = 0,
    maximum: IntLike = 16,
    key: bigint | null = null,
  ): Uint8Array {
    const low = big(minimum);
    const high = big(maximum);
    if (low < 0n || low > high) throw new RangeError("require 0 <= minimum <= maximum");
    this.checkChoiceBudget();

    const [at, useSimplest] = this.resolve("bytes", key);
    let value: Uint8Array;
    if (useSimplest) {
      value = Core.bytesSimplest(low);
    } else if (this.replay === null) {
      const rng = this.requireRng();
      value = rng.bytes(Number(rng.between(low, high)));
    } else {
      if (Core.replayBytesPuns(this.replay, at!, low, high)) this.root().puns++;
      value = Core.replayBytes(this.replay, at!, low, high);
    }
    this.record({
      kind: "bytes",
      encoded: Core.serializeBytesChoice(value),
      value,
      params: [low, high],
      forced: false,
      key,
    });
    return value;
  }

  /**
   * Draw text of length [minimum, maximum] over an alphabet, by default every
   * Unicode scalar value.
   *
   * Shrinking is shortlex over the alphabet's shrink order, which puts "0"
   * through "Z" first, so a minimal counterexample reads as "0" rather than as
   * a control character.
   */
  string(
    minimum: IntLike = 0,
    maximum: IntLike = 16,
    alphabet: Uint8Array | null = null,
    key: bigint | null = null,
  ): string {
    const characters = alphabet ?? UNICODE;
    const low = big(minimum);
    const high = big(maximum);
    if (low < 0n || low > high) throw new RangeError("require 0 <= minimum <= maximum");
    if (!Core.alphabetValid(characters)) {
      throw new RangeError("alphabet must be a canonical non-empty interval set");
    }
    this.checkChoiceBudget();

    const [at, useSimplest] = this.resolve("string", key);
    let value: Uint8Array;
    if (useSimplest) {
      value = Core.stringSimplest(characters, low);
    } else if (this.replay === null) {
      const rng = this.requireRng();
      const size = Number(rng.between(low, high));
      const biased = rng.between(0n, 999n) < Core.textBiasThreshold();
      const span = Core.textRankSpan(characters, biased);
      const packed = new Uint8Array(4 * size);
      for (let i = 0; i < size; i++) {
        const codepoint = Number(
          Core.alphabetShrinkCodepoint(characters, rng.between(0n, span - 1n)) ?? 0n,
        );
        packed[4 * i] = codepoint & 0xff;
        packed[4 * i + 1] = (codepoint >>> 8) & 0xff;
        packed[4 * i + 2] = (codepoint >>> 16) & 0xff;
        packed[4 * i + 3] = (codepoint >>> 24) & 0xff;
      }
      value = packed;
    } else {
      if (Core.replayStringPuns(this.replay, at!, characters, low, high)) this.root().puns++;
      value = Core.replayString(this.replay, at!, characters, low, high);
    }
    this.record({
      kind: "string",
      encoded: Core.serializeStringChoicePacked(BigInt(value.length / 4), value),
      value,
      params: [characters, low, high],
      forced: false,
      key,
    });
    return unpackCodepoints(value);
  }

  /**
   * Draw an IEEE-754 binary64 value with portable replay and shrinking.
   * Bounds use sign-aware ordering, so -0.0 is strictly below +0.0.
   */
  float(
    minimum = -Infinity,
    maximum = Infinity,
    options: {
      allowNan?: boolean;
      allowInfinity?: boolean;
      smallestNonzeroMagnitude?: number;
      key?: bigint | null;
    } = {},
  ): number {
    const allowNan = options.allowNan ?? false;
    const allowInfinity = options.allowInfinity ?? false;
    const smallestNonzero = options.smallestNonzeroMagnitude ?? 0;
    const key = options.key ?? null;

    if (
      !Core.floatGenerationSpecValid(minimum, maximum, allowNan, allowInfinity, smallestNonzero)
    ) {
      throw new RangeError("invalid float bounds");
    }
    const unit = Core.floatUnit(minimum, maximum, allowNan, allowInfinity, smallestNonzero);
    if (unit === null) throw new RangeError("float configuration admits no values");
    this.checkChoiceBudget();

    const [at, useSimplest] = this.resolve("float", key);
    let value: number;
    if (useSimplest) {
      const candidate = Core.floatSimplest(
        minimum,
        maximum,
        allowNan,
        allowInfinity,
        smallestNonzero,
      );
      if (candidate === null) throw new RangeError("float configuration admits no values");
      value = candidate;
    } else if (this.replay === null) {
      const rng = this.requireRng();
      // One family-wide category mixture, then one roll per draw. A category
      // the spec rules out yields to the default draw, so its mass is never
      // handed to a neighbouring category.
      const family = this.root();
      if (family.floatSwarm === null) family.floatSwarm = rng.nextU64();
      const category = Core.floatSwarmCategory(
        family.floatSwarm,
        rng.below(Core.floatSwarmRollSpan()),
      );
      value = Core.floatCategoryCandidate(
        category,
        minimum,
        maximum,
        allowNan,
        allowInfinity,
        smallestNonzero,
        rng.nextU64(),
        rng.nextU64(),
        rng.nextU64(),
        rng.nextU64(),
        rng.nextU64(),
      ) ?? Core.floatDefaultCandidate(
        minimum,
        maximum,
        allowNan,
        allowInfinity,
        smallestNonzero,
        rng.nextU64(),
        rng.nextU64(),
        rng.nextU64(),
        rng.nextU64(),
      );
    } else {
      if (
        Core.replayFloatPuns(
          this.replay,
          at!,
          minimum,
          maximum,
          allowNan,
          allowInfinity,
          smallestNonzero,
        )
      ) this.root().puns++;
      value = Core.replayFloat(
        this.replay,
        at!,
        minimum,
        maximum,
        allowNan,
        allowInfinity,
        smallestNonzero,
      ) ?? unit;
    }

    this.record({
      kind: "float",
      encoded: Core.serializeFloatChoice(value),
      value,
      params: [minimum, maximum, allowNan, allowInfinity, smallestNonzero],
      forced: false,
      key,
    });
    return value;
  }

  // A forced draw consumes a replay position without reading one, so a replay
  // stays aligned with the run that recorded it.
  /** @internal */
  forcedInteger(value: IntLike): bigint {
    const forced = big(value);
    this.checkChoiceBudget();
    if (this.replay !== null) this.advanceReplay("forced integer");
    this.record({
      kind: "integer",
      encoded: Core.serializeIntegerChoice(signedBytes(forced)),
      value: forced,
      params: [forced, forced, forced],
      forced: true,
      key: null,
    });
    return forced;
  }

  /** @internal */
  forcedBoolean(value: boolean): boolean {
    this.checkChoiceBudget();
    if (this.replay !== null) this.advanceReplay("forced boolean");
    this.record({
      kind: "boolean",
      encoded: Core.serializeBooleanChoice(value),
      value,
      params: [],
      forced: true,
      key: null,
    });
    return value;
  }

  /** @internal */
  finish(): void {}

  /** @internal */
  serialized(): Uint8Array {
    return serializedDraws(this.draws);
  }

  private requireRng(): Rng {
    if (this.rng === null) throw new InvalidReplay("test case has neither an rng nor a replay");
    return this.rng;
  }

  // Index the replay stream by key, innermost entry offset first.
  private keyOffsets(): Map<bigint, number[]> {
    if (this.keyed === null) {
      const offsets = new Map<bigint, number[]>();
      const replay = this.replay!;
      let position = 4n;
      let remaining = Core.choiceStreamCount(replay);
      while (remaining > 0n) {
        const end = Core.choiceEntryEnd(replay, position, 0n);
        if (end === 0n) break;
        const key = Core.keyedEntryKey(replay, position);
        if (key !== null) {
          const inner = Number(Core.keyedEntryInner(replay, position));
          const pending = offsets.get(key);
          if (pending === undefined) offsets.set(key, [inner]);
          else pending.push(inner);
        }
        position = end;
        remaining -= 1n;
      }
      this.keyed = offsets;
    }
    return this.keyed;
  }

  /**
   * Where this draw's recorded entry sits, or null to use the simplest value.
   *
   * An unkeyed draw takes the next positional entry and overruns when there is
   * none. A keyed draw takes the next entry recorded under its name and falls
   * back to the simplest value when the stream has none — a missing name is an
   * edit to the property, not a malformed blob.
   */
  private replayPosition(kind: string, key: bigint | null): bigint | null {
    if (key === null) return this.advanceReplay(kind);
    const pending = this.keyOffsets().get(key);
    if (pending === undefined || pending.length === 0) {
      this.root().keyMisses++;
      return null;
    }
    return BigInt(pending.shift()!);
  }

  /** Where to read this draw from, and whether to use its simplest value. */
  private resolve(kind: string, key: bigint | null): [bigint | null, boolean] {
    if (this.simplest) return [null, true];
    if (this.replay === null) return [null, false];
    const position = this.replayPosition(kind, key);
    return [position, position === null];
  }

  private advanceReplay(kind: string): bigint {
    for (;;) {
      if (this.replay === null || this.remaining === 0n) {
        throw new ReplayOverrun(`replay ended before ${kind} draw`);
      }
      const at = this.position;
      const ending = Core.choiceEntryEnd(this.replay, at, 0n);
      if (ending === 0n) throw new InvalidReplay(`invalid replay entry at offset ${at}`);
      this.position = ending;
      this.remaining -= 1n;
      // A named entry belongs to the draw that names it, wherever that draw
      // happens to fall. The positional cursor steps over it, so adding or
      // removing keyed draws cannot shift unkeyed ones.
      if (Core.keyedEntryKey(this.replay, at) === null) return at;
    }
  }
}

/** The stream entry for a draw: its value, wrapped if it has a name. */
function drawEntry(draw: Draw): Uint8Array {
  let encoded = draw.encoded;
  if (draw.kind === "clone") {
    const children = draw.child.draws;
    encoded = concatBytes([
      Core.serializeCloneHeader(BigInt(children.length)),
      ...children.map(drawEntry),
    ]);
  }
  return draw.key === null ? encoded : Core.serializeKeyedChoice(draw.key, encoded);
}

/**
 * Count a draw list the way Hegel's flattened length does: a clone contributes
 * itself plus everything inside it.
 */
function flatDrawCount(draws: readonly Draw[]): bigint {
  let total = 0n;
  for (const draw of draws) {
    total += 1n;
    if (draw.kind === "clone") total += flatDrawCount(draw.child.draws);
  }
  return total;
}

/**
 * Give a clone a stream of its own, drawn from its parent's, so two streams
 * never hand back the same values. A parent without an RNG (a bare replay, or
 * the all-simplest probe) has none to give.
 */
function spawnRng(rng: Rng | null): Rng | undefined {
  return rng === null ? undefined : new Rng(rng.nextU64());
}

/**
 * Hash a draw's name into the 64-bit key a stream records.
 *
 * Components may be strings or integers; the encoding is compiled
 * (ir/keys.zir) so the same name hashes identically in every language. A text
 * component is hashed as its UTF-8 bytes, which is what makes "identically"
 * true for a name that is not ASCII.
 */
export function keyEncode(components: readonly (string | number | bigint)[]): Uint8Array {
  let encoded: Uint8Array = new Uint8Array(new ArrayBuffer(0));
  for (const component of components) {
    encoded = typeof component === "string"
      ? Core.keyAppendText(encoded, utf8Bytes(component))
      : Core.keyAppendInt(encoded, signedBytes(BigInt(component)));
  }
  return encoded;
}

// Use this for a decision the property makes at most once per example. For a
// decision it makes repeatedly, see TestCase.nextKey.
export function keyHash(...components: readonly (string | number | bigint)[]): bigint {
  return Core.keyHash(keyEncode(components));
}

/**
 * Whether the targeting hill climber can step a draw. Strings have no
 * sensible "one larger", clones are streams rather than values, and a forced
 * draw is not this stream's to change.
 */
function climbableDraw(draw: Draw): boolean {
  if (draw.forced || draw.kind === "clone") return false;
  return draw.kind === "integer" || draw.kind === "boolean" ||
    draw.kind === "float" || draw.kind === "bytes";
}

/**
 * The draw stepped by delta, or null when the stepped value is not
 * representable within the draw's own constraints. Which values are reachable
 * is compiled (ir/targeting.zir targeting_step_*); this only re-encodes the
 * answer as a stream entry.
 */
function stepDraw(draw: Draw, delta: bigint): Draw | null {
  switch (draw.kind) {
    case "integer": {
      const stepped = Core.targetingStepInteger(
        signedBytes(draw.params[0]),
        signedBytes(draw.params[1]),
        signedBytes(draw.value),
        delta,
      );
      if (stepped === null) return null;
      return {
        ...draw,
        value: signedInt(stepped),
        encoded: Core.serializeIntegerChoice(stepped),
        forced: false,
      };
    }
    case "boolean": {
      const stepped = Core.targetingStepBoolean(draw.value, delta);
      if (stepped === null) return null;
      return {
        ...draw,
        value: stepped,
        encoded: Core.serializeBooleanChoice(stepped),
        forced: false,
      };
    }
    case "float": {
      const stepped = Core.targetingStepFloat(
        draw.params[0], draw.params[1], draw.params[2], draw.params[3],
        draw.params[4], draw.value, delta,
      );
      if (stepped === null) return null;
      return {
        ...draw,
        value: stepped,
        encoded: Core.serializeFloatChoice(stepped),
        forced: false,
      };
    }
    case "bytes": {
      const stepped = Core.targetingStepBytes(
        draw.params[0], draw.params[1], draw.value, delta,
      );
      if (stepped === null) return null;
      return {
        ...draw,
        value: stepped,
        encoded: Core.serializeBytesChoice(stepped),
        forced: false,
      };
    }
    default:
      return null;
  }
}

export function serializedDraws(draws: readonly Draw[]): Uint8Array {
  return concatBytes([
    Core.choiceListHeader(BigInt(draws.length)),
    ...draws.map(drawEntry),
  ]);
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

// Every choice stream a run has executed, so a mutation that would only repeat
// one is skipped. Membership is of whole streams, never of prefixes: a trie with
// a node per byte answered the same questions while holding megabytes for each
// long example until the run ended. A stream is keyed as a string of one
// character per byte, which is exact and which V8 stores a byte per character.
class StreamSet {
  private readonly streams = new Set<string>();

  contains(stream: Uint8Array): boolean {
    return this.streams.has(streamKey(stream));
  }

  insert(stream: Uint8Array): void {
    this.streams.add(streamKey(stream));
  }
}

function streamKey(stream: Uint8Array): string {
  let key = "";
  for (let at = 0; at < stream.length; at += 8192) {
    key += String.fromCharCode(...stream.subarray(at, at + 8192));
  }
  return key;
}

function spanMutationCandidates(
  draws: readonly Draw[],
  spans: readonly ChoiceSpan[],
  rng: Rng,
): Uint8Array[] {
  if (draws.some((draw) => draw.key !== null)) return [];
  const grouped = new Map<string, Map<string, [number, number]>>();
  for (const span of spans) {
    if (span.discarded || span.finish <= span.start || span.finish > draws.length) continue;
    const ranges = grouped.get(span.label) ?? new Map<string, [number, number]>();
    ranges.set(`${span.start}:${span.finish}`, [span.start, span.finish]);
    grouped.set(span.label, ranges);
  }
  const original = serializedDraws(draws);
  const candidates: Uint8Array[] = [];
  const labels = [...grouped.keys()].filter((label) => grouped.get(label)!.size >= 2).sort();
  if (labels.length === 0) return [];
  for (let attempt = 0n; attempt < Core.mutationAttemptCount(); attempt++) {
    const randomized = Core.mutationAttemptRandomized(attempt);
    const groupIndex = randomized
      ? Core.mutationIndex(BigInt(labels.length), rng.nextU64())
      : 0n;
    if (groupIndex === null) break;
    const label = labels[Number(groupIndex)];
    const ranges = [...grouped.get(label)!.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const first = randomized ? Core.mutationIndex(BigInt(ranges.length), rng.nextU64())! : 0n;
    const second = randomized
      ? Core.mutationDistinctIndex(BigInt(ranges.length), first, rng.nextU64())
      : 1n;
    if (second === null) continue;
    let a = ranges[Number(first)];
    let b = ranges[Number(second)];
    if (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) [a, b] = [b, a];
    const [aStart, aEnd] = a;
    const [bStart, bEnd] = b;
    const raw = Core.choiceMutateRanges(
      original,
      BigInt(aStart),
      BigInt(aEnd),
      BigInt(bStart),
      BigInt(bEnd),
      Core.mutationUseFirst(randomized ? rng.nextU64() : attempt),
    );
    if (raw === null || sameBytes(raw, original) || candidates.some((item) => sameBytes(item, raw))) continue;
    candidates.push(raw);
  }
  return candidates;
}

export type Property = (testCase: TestCase) => unknown;

export function execute(
  property: Property,
  options: { rng?: Rng; replay?: Uint8Array; simplest?: boolean } = {},
): [unknown, TestCase] {
  const testCase = new TestCase(options);
  try {
    const result = property(testCase);
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      typeof (result as { then?: unknown }).then === "function"
    ) {
      throw new AsyncPropertyError("check requires a synchronous property");
    }
    testCase.finish();
    if (result === false) throw new Error("property returned false");
    return [null, testCase];
  } catch (error) {
    return [error, testCase];
  } finally {
    testCase.closeOpenSpans();
  }
}

// ---------- shrinking ----------

// A schedule slot that maps to no legal value. Distinct from the schedule
// ending, because the search should step over it rather than give up on the
// choice.
const SCHEDULE_MISS = Symbol("schedule miss");

// The compiled schedule is defined over u64 indexes; byte draws can sit beyond
// that, and saturating keeps their earliest (most useful) candidates reachable.
const U64_MAX = (1n << 64n) - 1n;

function drawSortIndexBytes(draw: Draw): Uint8Array | null {
  switch (draw.kind) {
    // A clone carries a stream, not a value: it has no index of its own, and
    // drawsCompare compares it by that stream instead.
    case "clone":
      return null;
    case "boolean":
      return Core.booleanToIndex(draw.value);
    case "integer": {
      const [minimum, maximum, target] = draw.params;
      return Core.integerToIndex(
        signedBytes(minimum),
        signedBytes(maximum),
        signedBytes(target),
        signedBytes(draw.value),
      );
    }
    case "bytes":
      return Core.bytesToIndex(draw.params[0], draw.value);
    case "string":
      return Core.stringToIndex(draw.params[0], draw.params[1], draw.value);
    case "float":
      return Core.floatChoiceToIndex(...draw.params, draw.value);
  }
}

/** The choice's unconstrained index for shortlex comparison. */
export function drawSortIndex(draw: Draw): bigint | null {
  const encoded = drawSortIndexBytes(draw);
  return encoded === null ? null : signedInt(encoded);
}

/** Where a draw currently sits in its own shrink schedule. */
// What makes two draws duplicates of each other, as a string so that array
// membership compares by value.
//
// Upstream groups by (choice type, value) and lowers the group using the first
// member's constraints, accepting that a member with different constraints may
// reject the shared value. Grouping by the *index* instead is the same idea in
// the coordinate the schedule already walks: two draws with equal bounds share an
// index exactly when they share a value, and a member whose bounds differ is
// rebuilt for its own bounds or misses. A forced draw is never a member — it has
// no index and may not be rewritten.
export function drawGroupKey(draw: Draw): string | null {
  const index = drawIndex(draw);
  return index === null ? null : `${draw.kind}:${index}`;
}

export function drawIndex(draw: Draw): bigint | null {
  if (draw.forced) return null;
  const index = drawSortIndex(draw);
  if (index === null) return null;
  return index < U64_MAX ? index : U64_MAX;
}

/**
 * Where a draw sits and the largest index it could move to, for the raise
 * pass, or null for a draw the pass leaves alone.
 *
 * Upstream raises every node but a sequence, so strings and byte strings are
 * skipped — their index bundles length and content, and a larger one is a
 * longer value — and so are clones, which carry a stream rather than a value,
 * and forced draws, which are not this stream's to change.
 */
function raiseBounds(draw: Draw): [bigint, bigint] | null {
  if (draw.forced) return null;
  let largest: Uint8Array;
  switch (draw.kind) {
    case "boolean":
      largest = Core.booleanMaxIndex();
      break;
    case "integer":
      largest = Core.integerMaxIndex(signedBytes(draw.params[0]), signedBytes(draw.params[1]));
      break;
    case "float":
      largest = Core.floatChoiceMaxIndex();
      break;
    default:
      return null;
  }
  const current = drawIndex(draw);
  if (current === null) return null;
  const maximum = signedInt(largest);
  return [current, maximum < U64_MAX ? maximum : U64_MAX];
}

// Rebuild every choice in a span at its simplest value, and report how many of
// them the pass was actually able to move.
//
// This is upstream's try_trivial_spans. Per-choice descent walks one draw at a
// time and stops the moment a candidate stops failing, so a span whose choices
// only fail *together* at their simplest values is out of its reach — and the
// all-simplest probe does not help either, because it collapses the whole
// example rather than one span of it. A forced draw is left alone, as in every
// other pass, and a draw already at index 0 is copied rather than rebuilt.
export function trivialSpanCandidate(
  draws: Draw[],
  span: ChoiceSpan,
): [Draw[], bigint] {
  const trial = [...draws];
  let rewritable = 0n;
  for (let at = span.start; at < Math.min(span.finish, draws.length); at++) {
    const index = drawIndex(draws[at]);
    if (index === null || index === 0n) continue;
    const simplest = drawAtIndex(draws[at], 0n);
    if (simplest === SCHEDULE_MISS) continue;
    trial[at] = simplest;
    rewritable++;
  }
  return [trial, rewritable];
}

// A string draw with the character at one position removed.
//
// The whole-value index bundles length and content into one number, and the
// downward search over it converges on the wrong end of the interval: from
// "abb" over an "abcdef" alphabet it probes eleven candidates and never reaches
// "bb", which sits far below. Removing a character is the candidate that search
// cannot produce.
export function shortenString(draw: Draw, position: bigint): Draw | null {
  if (draw.kind !== "string" || draw.forced) return null;
  const shortened = Core.stringDropCharacter(
    draw.value as Uint8Array,
    draw.params[1] as bigint,
    position,
  );
  if (shortened === null) return null;
  return {
    ...draw,
    value: shortened,
    encoded: Core.serializeStringChoicePacked(BigInt(shortened.length / 4), shortened),
  };
}

// A string draw with every copy of one repeated character lowered.
//
// A string draw carries a single whole-value index, so the per-choice schedule
// can only slide the entire value along one linear order. A property that
// depends on two *characters* of that value agreeing is the case it cannot
// serve — M12's shape, one level down and inside a single draw. `value` is the
// packed u32-LE form the stream records, as stringToIndex consumes it.
export function lowerCharacters(draw: Draw, ordinal: bigint): Draw | null {
  if (draw.kind !== "string" || draw.forced) return null;
  const alphabet = draw.params[0] as Uint8Array;
  const rank = Core.stringDuplicateRank(alphabet, draw.value as Uint8Array);
  if (rank === null) return null;
  const target = Core.shrinkCandidateAt(rank, ordinal);
  if (target === null) return null;
  const replaced = Core.stringReplaceRank(alphabet, draw.value as Uint8Array, rank, target);
  if (replaced === null) return null;
  return {
    ...draw,
    value: replaced,
    encoded: Core.serializeStringChoicePacked(BigInt(replaced.length / 4), replaced),
  };
}

// The ordinal-th span strictly nested inside spans[at].
//
// Upstream's pass_to_descendant picks a random descendant; a cursor machine has
// no chooser, so the ancestor is the cursor and the descendant is the ordinal.
// Spans are recorded in the order they open, so scanning forward from the
// ancestor gives a stable enumeration in every language.
export function descendantSpan(
  spans: ChoiceSpan[],
  at: number,
  ordinal: bigint,
): ChoiceSpan | null {
  const ancestor = spans[at];
  if (ancestor.discarded || ancestor.finish <= ancestor.start) return null;
  let seen = 0n;
  for (let other = at + 1; other < spans.length; other++) {
    const candidate = spans[other];
    if (candidate.start < ancestor.start || candidate.finish > ancestor.finish) continue;
    if (candidate.discarded || candidate.depth <= ancestor.depth) continue;
    if (
      !Core.shrinkDescendantWorthwhile(
        BigInt(ancestor.finish - ancestor.start),
        BigInt(candidate.finish - candidate.start),
      )
    ) continue;
    if (seen === ordinal) return candidate;
    seen++;
  }
  return null;
}

// The span that should trade places with spans[at].
//
// Upstream groups a span's children by label and sorts the group; taking only
// the *next* member makes each request one adjacent swap, and repeating it
// until nothing moves sorts the group the same way. A discarded span is never a
// member: its choices are a rejected candidate's debris, so its position
// carries no meaning to canonicalize.
/**
 * The choices a paid deletion of spans[at] removes, and whether that extent is
 * wider than the span itself.
 *
 * A span of two or more choices is deleted exactly, as the deletion pass
 * already tried on its own. A single-choice span takes upstream's extent: the
 * span with the spanless choice before it, or else stretched to the start of
 * the next span. A discarded span is never a candidate — its choices are a
 * rejected candidate's debris or a collection's stop marker, and paying for
 * their deletion buys nothing — and neither is an extent covering the whole
 * stream.
 */
function paidExtent(
  draws: Draw[],
  spans: ChoiceSpan[],
  at: number,
): { start: number; finish: number; widened: boolean } | null {
  const span = spans[at];
  if (span.discarded || span.finish <= span.start || span.finish > draws.length) return null;
  let start = span.start;
  let finish = span.finish;
  let widened = false;
  if (finish - start < 2) {
    widened = true;
    const preceded = start > 0 &&
      !spans.some((other) => other.finish === start && other.start < start);
    if (preceded) {
      start -= 1;
    } else {
      finish = Math.min(
        draws.length,
        ...spans.map((other) => other.start).filter((other) => other >= span.finish),
      );
      if (finish <= span.finish) return null;
    }
  }
  if (start === 0 && finish === draws.length) return null;
  return { start, finish, widened };
}

/**
 * The draw that pays for deleting spans[at]: the first one after the structure
 * enclosing it.
 *
 * Upstream takes the innermost ancestor span reaching past the deletion. A
 * zizek collection opens no span of its own — its elements are a run of
 * adjacent sibling spans sharing a label, ending in the discarded span of its
 * final "no more" choice — so that run is what plays the part of the list, and
 * only a span outside any such run falls back to its ancestors.
 */
function paidFollower(
  spans: ChoiceSpan[],
  at: number,
  finish: number,
  drawCount: number,
): number | null {
  const span = spans[at];
  let runEnd = span.finish;
  let extended = false;
  for (let other = at + 1; other < spans.length; other++) {
    const candidate = spans[other];
    if (candidate.parent !== span.parent) continue;
    if (candidate.label !== span.label || candidate.start !== runEnd) break;
    runEnd = candidate.finish;
    extended = true;
  }
  let boundary: number | null = null;
  if (extended) {
    boundary = runEnd;
  } else {
    for (let parent = span.parent; parent !== null; parent = spans[parent].parent) {
      if (spans[parent].finish > finish) {
        boundary = spans[parent].finish;
        break;
      }
    }
  }
  if (boundary === null || boundary < finish || boundary >= drawCount) return null;
  return boundary;
}

/**
 * The paying draw moved one step: an integer down or up, a boolean to the side
 * the step names, a string one character shorter. Null when this draw cannot
 * take this step, so the pass moves to the next one without running the
 * property.
 */
function nudgeDraw(draw: Draw, step: bigint): Draw | null {
  if (draw.forced) return null;
  switch (draw.kind) {
    case "integer":
      return stepDraw(draw, step);
    case "boolean": {
      const stepped = stepDraw(draw, step);
      return stepped === null || stepped.value === draw.value ? null : stepped;
    }
    case "string":
      return step < 0n
        ? shortenString(draw, BigInt((draw.value as Uint8Array).length / 4 - 1))
        : null;
    default:
      return null;
  }
}

export function nextSibling(spans: ChoiceSpan[], at: number): number | null {
  const span = spans[at];
  if (span.discarded || span.finish <= span.start) return null;
  for (let other = at + 1; other < spans.length; other++) {
    const candidate = spans[other];
    if (candidate.discarded || candidate.parent !== span.parent) continue;
    if (candidate.label !== span.label) continue;
    if (candidate.finish <= candidate.start || candidate.start < span.finish) continue;
    return other;
  }
  return null;
}

// Where a draw sits in its schedule, for the adjacent-pair pass.
//
// Upstream's lower_integers_together takes integer nodes only, and so does
// this: the shift it makes is meaningful in value space precisely because an
// integer's index is its distance from its own shrink target. A byte string's
// index is a shortlex position, and shifting two of those by a shared amount
// preserves nothing a property could depend on.
export function pairIndex(draw: Draw): bigint | null {
  return draw.kind === "integer" ? drawIndex(draw) : null;
}

/** Choice-count-first shortlex. */
export function drawsSimpler(candidate: readonly Draw[], current: readonly Draw[]): boolean {
  return drawsCompare(candidate, current) < 0;
}

/**
 * Order two draw lists: negative when candidate is the simpler of the two.
 *
 * The count that decides first is the *flattened* one, so a candidate that
 * removes a choice from inside a clone is simpler even though the parent's own
 * entry count has not moved — without that, a nested shrink could never make
 * progress the accept rule would keep. A clone is then compared by its own
 * stream, recursively, which is the same rule one level down.
 */
export function drawsCompare(candidate: readonly Draw[], current: readonly Draw[]): number {
  const left = flatDrawCount(candidate);
  const right = flatDrawCount(current);
  if (left !== right) return left < right ? -1 : 1;
  if (candidate.length !== current.length) {
    return candidate.length < current.length ? -1 : 1;
  }
  for (let i = 0; i < candidate.length; i++) {
    const candidateDraw = candidate[i];
    const currentDraw = current[i];
    if (candidateDraw.kind === "clone" || currentDraw.kind === "clone") {
      if (candidateDraw.kind !== "clone" || currentDraw.kind !== "clone") return 1;
      const order = drawsCompare(candidateDraw.child.draws, currentDraw.child.draws);
      if (order !== 0) return order;
      continue;
    }
    if (
      candidateDraw.kind === "string" &&
      currentDraw.kind === "string" &&
      candidateDraw.params[1] === currentDraw.params[1] &&
      sameBytes(candidateDraw.params[0], currentDraw.params[0])
    ) {
      // The core orders two strings of one alphabet and minimum size without
      // building either index; a long string's index is too costly to build
      // for every shrink candidate.
      const order = Core.stringIndexCompare(
        candidateDraw.params[0],
        candidateDraw.params[1],
        candidateDraw.value,
        currentDraw.value,
      );
      if (order !== 0n) return Number(order);
      continue;
    }
    const candidateIndex = drawSortIndexBytes(candidateDraw);
    const currentIndex = drawSortIndexBytes(currentDraw);
    if (candidateIndex === null || currentIndex === null) return 1;
    const order = Core.signedCompareLe(candidateIndex, currentIndex);
    if (order !== 0n) return Number(order);
  }
  return 0;
}

/** Rebuild a draw at a schedule index, or report a miss. */
/**
 * An integer draw at the ordinal-th extra lowering candidate, or null.
 *
 * The index schedule bisects, which finds the edge of an interval; a sparse
 * failing set such as the positive multiples of 1000 is not one, and from 10^9
 * the bisection stops at 875000. The divisions and trailing-zeros moves that
 * carry on from there are compiled (integer_shrink_extra); this only re-encodes
 * the value they choose.
 */
function integerExtraDraw(draw: Draw, ordinal: bigint): Draw | null {
  if (draw.kind !== "integer" || draw.forced) return null;
  const [minimum, maximum, target] = draw.params;
  const value = Core.integerShrinkExtra(
    signedBytes(minimum),
    signedBytes(maximum),
    signedBytes(target),
    signedBytes(draw.value),
    ordinal,
  );
  if (value === null) return null;
  return {
    ...draw,
    value: signedInt(value),
    encoded: Core.serializeIntegerChoice(value),
    forced: false,
  };
}

export function drawAtIndex(draw: Draw, index: bigint): Draw | typeof SCHEDULE_MISS {
  switch (draw.kind) {
    // A clone is not rebuilt at an index; the nested pass shrinks the stream
    // inside it instead.
    case "clone":
      return SCHEDULE_MISS;
    case "boolean": {
      const value = Core.booleanFromIndex(signedBytes(index));
      if (value === null) return SCHEDULE_MISS;
      return {
        kind: "boolean",
        encoded: Core.serializeBooleanChoice(value),
        value,
        params: draw.params,
        forced: false,
        // A rebuilt candidate keeps its name: a lowered draw that lost it
        // would be looked up positionally on the next execution, so every
        // candidate for a keyed draw would be rejected and nothing would
        // shrink.
        key: draw.key,
      };
    }
    case "integer": {
      const [minimum, maximum, target] = draw.params;
      const valueBytes = Core.integerFromIndex(
        signedBytes(minimum),
        signedBytes(maximum),
        signedBytes(target),
        signedBytes(index),
      );
      if (valueBytes === null) return SCHEDULE_MISS;
      return {
        kind: "integer",
        encoded: Core.serializeIntegerChoice(valueBytes),
        value: signedInt(valueBytes),
        params: draw.params,
        forced: false,
        // A rebuilt candidate keeps its name: a lowered draw that lost it
        // would be looked up positionally on the next execution, so every
        // candidate for a keyed draw would be rejected and nothing would
        // shrink.
        key: draw.key,
      };
    }
    case "bytes": {
      const [minimum, maximum] = draw.params;
      const value = Core.bytesFromIndex(minimum, maximum, signedBytes(index));
      if (value === null) return SCHEDULE_MISS;
      return {
        kind: "bytes",
        encoded: Core.serializeBytesChoice(value),
        value,
        params: draw.params,
        forced: false,
        // A rebuilt candidate keeps its name: a lowered draw that lost it
        // would be looked up positionally on the next execution, so every
        // candidate for a keyed draw would be rejected and nothing would
        // shrink.
        key: draw.key,
      };
    }
    case "string": {
      const [characters, minimum, maximum] = draw.params;
      const value = Core.stringFromIndex(characters, minimum, maximum, signedBytes(index));
      if (value === null) return SCHEDULE_MISS;
      return {
        kind: "string",
        encoded: Core.serializeStringChoicePacked(BigInt(value.length / 4), value),
        value,
        params: draw.params,
        forced: false,
        // A rebuilt candidate keeps its name: a lowered draw that lost it
        // would be looked up positionally on the next execution, so every
        // candidate for a keyed draw would be rejected and nothing would
        // shrink.
        key: draw.key,
      };
    }
    case "float": {
      const value = Core.floatChoiceFromIndex(...draw.params, signedBytes(index));
      if (value === null) return SCHEDULE_MISS;
      return {
        kind: "float",
        encoded: Core.serializeFloatChoice(value),
        value,
        params: draw.params,
        forced: false,
        // A rebuilt candidate keeps its name: a lowered draw that lost it
        // would be looked up positionally on the next execution, so every
        // candidate for a keyed draw would be rejected and nothing would
        // shrink.
        key: draw.key,
      };
    }
  }
}

/** Every shrink candidate for a draw, in schedule order. */
export function candidateDraws(draw: Draw): Draw[] {
  const current = drawIndex(draw);
  if (current === null) return [];
  const candidates: Draw[] = [];
  for (let ordinal = 0n;; ordinal++) {
    const index = Core.shrinkCandidateAt(current, ordinal);
    if (index === null) break;
    const candidate = drawAtIndex(draw, index);
    if (candidate !== SCHEDULE_MISS) candidates.push(candidate);
  }
  return candidates;
}

// Outcome tags are defined by ir/lifecycle.zir. Deriving one from a thrown
// value is the shell's job; deciding what it means is the core's.
const OUTCOME_VALID = 0n;
const OUTCOME_REJECTED = 1n;
const OUTCOME_OVERRUN = 2n;
const OUTCOME_INVALID = 3n;
const OUTCOME_INTERESTING = 4n;

export function classify(error: unknown): bigint {
  if (error === null) return OUTCOME_VALID;
  if (error instanceof AssumptionRejected) return OUTCOME_REJECTED;
  if (error instanceof ReplayOverrun || error instanceof ChoiceOverrun) return OUTCOME_OVERRUN;
  if (error instanceof InvalidReplay) return OUTCOME_INVALID;
  return OUTCOME_INTERESTING;
}

/**
 * Identify which bug a thrown value represents: its constructor and where it
 * was thrown, never its message, since a message that quotes a drawn value
 * would change on every shrink step and stop the search immediately.
 *
 * The reported frame is the first one outside this shell, so an error the
 * shell throws on the property's behalf — always, unreachable — is identified
 * by its call site rather than by the shell's one throw line, which every
 * such assertion in the property would share.
 */
export function interestingOrigin(error: unknown): string {
  if (!(error instanceof Error)) return "<unknown>";
  const frames = (error.stack ?? "").split("\n").slice(1);
  const frame = (frames.find((line) => !line.includes(import.meta.filename)) ?? frames[0] ?? "")
    .trim();
  return `${error.constructor.name} ${frame}`;
}

// Whether an outcome is a failure of the bug being shrunk. Accepting any
// failure lets the search migrate to an unrelated bug that happens to be easier
// to reach, and then report a minimal counterexample for a bug the run never
// found.
function isFailure(error: unknown, origin: string | null): boolean {
  const outcome = classify(error);
  if (!Core.outcomeIsFailure(outcome)) return false;
  return Core.shrinkAccept(outcome, origin === null || interestingOrigin(error) === origin);
}

// Request kinds and feedback codes are defined by ir/lifecycle.zir.
const PHASE_BASELINE = 0n;

const REQUEST_DONE = 0n;
const REQUEST_BASELINE = 1n;

// Internal control flow: the shrinker replayed an example that had failed and
// it did not fail the same way. The run reports it as Flaky.
class FlakyReplay extends Error {}
const REQUEST_DELETE_SPAN = 2n;
const REQUEST_LOWER = 3n;
const REQUEST_VERIFY = 4n;
const REQUEST_LOWER_DUPLICATES = 5n;
const REQUEST_LOWER_PAIR = 6n;
const REQUEST_REORDER = 7n;
const REQUEST_TRIVIAL_SPAN = 8n;
const REQUEST_DESCENDANT = 9n;
const REQUEST_LOWER_CHARACTERS = 10n;
const REQUEST_SHORTEN_STRING = 11n;
const REQUEST_DELETE_PAID = 12n;
const REQUEST_RAISE = 13n;

const FEEDBACK_SKIP = 0n;
const FEEDBACK_REJECTED = 1n;
const FEEDBACK_ACCEPTED = 2n;

/**
 * Serve the generated shrink schedule until it reports done.
 *
 * The search order lives in the core; this loop only runs the property, maps
 * the outcome onto a feedback code, and turns a request into a concrete
 * candidate. A zero cap leaves the search unbounded.
 */
/**
 * One execution of a candidate: the whole family it produced, and the case
 * whose draws the candidate stream became. The two differ only when the level
 * being shrunk is a clone's stream rather than the family's own.
 */
interface ShrinkRun {
  family: TestCase;
  subject: TestCase;
  error: unknown;
}

/** A level is one stream the driver can minimize. */
type ShrinkLevel = (candidate: Uint8Array) => ShrinkRun;

/** The level that shrinks the stream the property was handed. */
function familyLevel(property: Property): ShrinkLevel {
  return (candidate: Uint8Array): ShrinkRun => {
    const [error, testCase] = execute(property, { replay: candidate });
    return { family: testCase, subject: testCase, error };
  };
}

/**
 * Serve the generated shrink schedule over one level until it reports done.
 * `shrinks` is how many shrinks the sweep accepted, which is what its cap
 * counts.
 */
function shrinkStream(
  property: Property,
  level: ShrinkLevel,
  family: TestCase,
  subject: TestCase,
  origin: string | null = null,
  options: { maxShrinks?: bigint; maxStall?: bigint } = {},
): { verified: [unknown, TestCase] | null; best: TestCase; accepted: boolean; shrinks: bigint } {
  const maxShrinks = options.maxShrinks ?? 0n;
  const maxStall = options.maxStall ?? 0n;

  let draws = [...subject.draws];
  let spans = [...subject.spans];
  let familyDraws = [...family.draws];
  let cost = family.totalCost();
  let best = family;
  let accepted = false;
  let verified: [unknown, TestCase] | null = null;
  let scheduleAt = -1n;
  let scheduleIndex: bigint | null = null;
  let scheduleCount = 0n;

  const adopt = (run: ShrinkRun): void => {
    // accepted means *improved*, not merely adopted: the baseline replays the
    // example the caller already had, and a caller that treated that as
    // progress would descend into the same clone forever.
    if (
      run.family.totalCost() < cost ||
      drawsCompare(run.family.draws, familyDraws) < 0
    ) {
      accepted = true;
    }
    cost = run.family.totalCost();
    draws = [...run.subject.draws];
    spans = [...run.subject.spans];
    familyDraws = [...run.family.draws];
    best = run.family;
    scheduleAt = -1n;
  };

  let phase = PHASE_BASELINE;
  let spanCursor = 0n;
  let duplicateCursor = 0n;
  let position = 0n;
  let pairCursor = 0n;
  let reorderCursor = 0n;
  let trivialCursor = 0n;
  let descendantCursor = 0n;
  let characterCursor = 0n;
  let shortenCursor = 0n;
  let paidCursor = 0n;
  let raiseCursor = 0n;
  let ordinal = 0n;
  let shrinks = 0n;
  let stall = 0n;

  for (;;) {
    const drawCount = BigInt(draws.length);
    const spanCount = BigInt(spans.length);
    const kind = Core.shrinkRequestKind(
      phase,
      spanCursor,
      duplicateCursor,
      position,
      pairCursor,
      reorderCursor,
      trivialCursor,
      descendantCursor,
      characterCursor,
      shortenCursor,
      paidCursor,
      raiseCursor,
      drawCount,
      spanCount,
    );
    if (kind === REQUEST_DONE) break;

    let feedback = FEEDBACK_SKIP;
    const attempt = (replay: Uint8Array, requireSimpler: boolean): void => {
      const run = level(replay);
      if (
        isFailure(run.error, origin) &&
        Core.shrinkCostProgress(
          run.family.totalCost(),
          cost,
          !requireSimpler || drawsSimpler(run.family.draws, familyDraws),
        )
      ) {
        adopt(run);
        feedback = FEEDBACK_ACCEPTED;
      } else {
        feedback = FEEDBACK_REJECTED;
      }
    };

    switch (kind) {
      case REQUEST_BASELINE: {
        // The baseline replays a stream that has already failed — the example
        // as found, or a candidate that failed when it was adopted — so one
        // that does not fail now is the property, not the search.
        const run = level(serializedDraws(draws));
        if (!isFailure(run.error, origin)) throw new FlakyReplay();
        adopt(run);
        feedback = FEEDBACK_ACCEPTED;
        break;
      }
      case REQUEST_DELETE_SPAN: {
        const span = spans[Number(Core.shrinkRequestSpan(spanCursor, spanCount))];
        const candidate = span.finish > span.start
          ? Core.choiceDeleteRange(
            serializedDraws(draws),
            BigInt(span.start),
            BigInt(span.finish),
          )
          : null;
        if (candidate !== null) attempt(candidate, true);
        break;
      }
      case REQUEST_DELETE_PAID: {
        // A deletion the plain pass could not make, paid for by moving the draw
        // after the enclosing structure one step: a list's declared length, an
        // index into it, a parity flag drawn after it.
        const at = Number(Core.shrinkRequestSpan(paidCursor, spanCount));
        const extent = paidExtent(draws, spans, at);
        const follower = extent === null
          ? null
          : paidFollower(spans, at, extent.finish, draws.length);
        const step = extent !== null && (follower !== null || extent.widened)
          ? Core.shrinkDeletePaidVariant(ordinal, extent.widened)
          : null;
        if (extent !== null && step !== null) {
          const trial = [...draws.slice(0, extent.start), ...draws.slice(extent.finish)];
          let legal = true;
          if (step !== 0n) {
            const nudged = follower === null ? null : nudgeDraw(draws[follower], step);
            if (nudged === null) {
              legal = false;
            } else {
              trial[follower! - (extent.finish - extent.start)] = nudged;
            }
          }
          if (legal) {
            attempt(serializedDraws(trial), true);
          } else {
            // This draw cannot take this step; try the next one without running
            // the property.
            feedback = FEEDBACK_REJECTED;
          }
        }
        break;
      }
      case REQUEST_LOWER: {
        if (position !== scheduleAt) {
          scheduleAt = position;
          scheduleIndex = drawIndex(draws[Number(position)]);
          scheduleCount = scheduleIndex === null ? 0n : Core.shrinkCandidateCount(scheduleIndex);
        }
        let candidate: Draw | typeof SCHEDULE_MISS | null = null;
        if (scheduleIndex !== null) {
          const index = Core.shrinkCandidateAt(scheduleIndex, ordinal);
          // Past the index schedule an integer still has the value-space moves
          // bisection cannot make.
          candidate = index === null
            ? integerExtraDraw(draws[Number(position)], ordinal - scheduleCount)
            : drawAtIndex(draws[Number(position)], index);
        }
        if (candidate !== null) {
          if (candidate === SCHEDULE_MISS) {
            // No legal value here; step the schedule without running.
            feedback = FEEDBACK_REJECTED;
          } else {
            const trial = [...draws];
            trial[Number(position)] = candidate;
            attempt(serializedDraws(trial), true);
          }
        }
        break;
      }
      case REQUEST_LOWER_DUPLICATES: {
        // Every draw that currently sits where this one does, lowered as one.
        // Neither member can move alone when the property depends on them being
        // equal: dropping either breaks the failure, so the per-choice pass
        // rejects every candidate and leaves the pair where it was.
        const groupKey = drawGroupKey(draws[Number(duplicateCursor)]);
        const members: number[] = [];
        if (groupKey !== null) {
          for (let at = 0; at < draws.length; at++) {
            if (drawGroupKey(draws[at]) === groupKey) members.push(at);
          }
        }
        // One position drives each group, so a group of n is tried once and not
        // n times.
        const leads = members.length > 0 && BigInt(members[0]) === duplicateCursor;
        const current = groupKey === null ? 0n : drawIndex(draws[Number(duplicateCursor)])!;
        const index = leads && Core.shrinkDuplicateWorthwhile(BigInt(members.length), current)
          ? Core.shrinkCandidateAt(current, ordinal)
          : null;
        if (index !== null) {
          const trial = [...draws];
          let missed = false;
          for (const at of members) {
            const candidate = drawAtIndex(draws[at], index);
            if (candidate === SCHEDULE_MISS) {
              missed = true;
              break;
            }
            trial[at] = candidate;
          }
          if (missed) {
            // No legal value for some member; step the schedule without running
            // the property.
            feedback = FEEDBACK_REJECTED;
          } else {
            attempt(serializedDraws(trial), true);
          }
        }
        break;
      }
      case REQUEST_LOWER_PAIR: {
        // Two adjacent integer draws, lowered by one shared amount. This is the
        // difference-preserving move: a property that fails on x-y==5 rejects
        // every candidate the per-choice pass offers, because lowering either
        // member alone changes the difference.
        const members = [Number(pairCursor), Number(pairCursor) + 1];
        const indexes = members.map((at) => pairIndex(draws[at]));
        const [left, right] = indexes;
        let base = 0n;
        let index: bigint | null = null;
        if (left !== null && right !== null && Core.shrinkPairWorthwhile(left, right)) {
          base = Core.shrinkPairBase(left, right);
          index = Core.shrinkCandidateAt(base, ordinal);
        }
        if (index !== null) {
          const trial = [...draws];
          let missed = false;
          for (let member = 0; member < members.length; member++) {
            const shifted = Core.shrinkPairCandidate(indexes[member]!, base, index);
            if (shifted === null) {
              missed = true;
              break;
            }
            const candidate = drawAtIndex(draws[members[member]], shifted);
            if (candidate === SCHEDULE_MISS) {
              missed = true;
              break;
            }
            trial[members[member]] = candidate;
          }
          if (missed) {
            // No legal value for one member; step the schedule without running
            // the property.
            feedback = FEEDBACK_REJECTED;
          } else {
            attempt(serializedDraws(trial), true);
          }
        }
        break;
      }
      case REQUEST_TRIVIAL_SPAN: {
        // A whole span at its simplest values, in one execution.
        const span = spans[Number(trivialCursor)];
        if (!span.discarded && span.finish > span.start) {
          const [trial, rewritable] = trivialSpanCandidate(draws, span);
          if (Core.shrinkTrivialWorthwhile(rewritable)) {
            attempt(serializedDraws(trial), true);
          }
        }
        break;
      }
      case REQUEST_DESCENDANT: {
        // A span replaced by one of its own descendants. Deletion removes a
        // whole subtree; this keeps the subtree and discards the structure
        // wrapped around it, which is the move a nested failure needs when the
        // interesting part is buried rather than beside something.
        const inner = descendantSpan(spans, Number(descendantCursor), ordinal);
        let candidate: Uint8Array | null = null;
        if (inner !== null) {
          const outer = spans[Number(descendantCursor)];
          // Two deletions rather than a new primitive: drop the tail after the
          // descendant, then the head before it. Trailing first, so the leading
          // offsets are still the ones measured above.
          const after = Core.choiceDeleteRange(
            serializedDraws(draws),
            BigInt(inner.finish),
            BigInt(outer.finish),
          );
          if (after !== null) {
            candidate = Core.choiceDeleteRange(
              after,
              BigInt(outer.start),
              BigInt(inner.start),
            );
          }
        }
        if (candidate !== null) attempt(candidate, true);
        break;
      }
      case REQUEST_REORDER: {
        // Two sibling spans trade places. Nothing about the example changes
        // except which order its parts were drawn in, so this reports a
        // canonical arrangement rather than the one generation stumbled on.
        const sibling = nextSibling(spans, Number(reorderCursor));
        let candidate: Uint8Array | null = null;
        if (sibling !== null) {
          const first = spans[Number(reorderCursor)];
          const second = spans[sibling];
          candidate = Core.choiceSwapRanges(
            serializedDraws(draws),
            BigInt(first.start),
            BigInt(first.finish),
            BigInt(second.start),
            BigInt(second.finish),
          );
        }
        if (candidate !== null) attempt(candidate, true);
        break;
      }
      case REQUEST_SHORTEN_STRING: {
        // One character removed from a string draw.
        const candidate = shortenString(draws[Number(shortenCursor)], ordinal);
        if (candidate !== null) {
          const trial = [...draws];
          trial[Number(shortenCursor)] = candidate;
          attempt(serializedDraws(trial), true);
        }
        break;
      }
      case REQUEST_LOWER_CHARACTERS: {
        // Every copy of one repeated character in a string draw, lowered
        // together.
        const candidate = lowerCharacters(draws[Number(characterCursor)], ordinal);
        if (candidate !== null) {
          const trial = [...draws];
          trial[Number(characterCursor)] = candidate;
          attempt(serializedDraws(trial), true);
        }
        break;
      }
      case REQUEST_RAISE: {
        // One draw made *less* simple, kept only when the run that comes back is
        // smaller: a gate past its threshold, so the draws behind it are never
        // made. The candidate is larger as written, so the accept rule judges
        // the executed run alone.
        const bounds = raiseBounds(draws[Number(raiseCursor)]);
        const index = bounds === null
          ? null
          : Core.shrinkRaiseCandidate(bounds[0], bounds[1], ordinal);
        if (index !== null) {
          const candidate = drawAtIndex(draws[Number(raiseCursor)], index);
          if (candidate === SCHEDULE_MISS) {
            // No legal value there; try the next raise without running.
            feedback = FEEDBACK_REJECTED;
          } else {
            const trial = [...draws];
            trial[Number(raiseCursor)] = candidate;
            attempt(serializedDraws(trial), true);
          }
        }
        break;
      }
      case REQUEST_VERIFY: {
        const run = level(serializedDraws(draws));
        if (!isFailure(run.error, origin)) {
          throw new FlakyReplay();
        }
        verified = [run.error, run.family];
        best = run.family;
        feedback = FEEDBACK_ACCEPTED;
        break;
      }
    }

    [
      phase, spanCursor, duplicateCursor, position, pairCursor, reorderCursor,
      trivialCursor, descendantCursor, characterCursor, shortenCursor, paidCursor, raiseCursor,
      ordinal, shrinks, stall,
    ] = [
      Core.shrinkNextPhase(
        phase, feedback, spanCursor, duplicateCursor, position, pairCursor, reorderCursor,
        trivialCursor, descendantCursor, characterCursor, shortenCursor, paidCursor, raiseCursor,
        shrinks, stall,
        maxShrinks, maxStall, drawCount, spanCount,
      ),
      Core.shrinkNextSpanCursor(phase, feedback, spanCursor),
      Core.shrinkNextDuplicateCursor(phase, feedback, duplicateCursor),
      Core.shrinkNextPosition(phase, feedback, position),
      Core.shrinkNextPairCursor(phase, feedback, pairCursor),
      Core.shrinkNextReorderCursor(phase, feedback, reorderCursor),
      Core.shrinkNextTrivialCursor(phase, feedback, trivialCursor),
      Core.shrinkNextDescendantCursor(phase, feedback, descendantCursor),
      Core.shrinkNextCharacterCursor(phase, feedback, characterCursor),
      Core.shrinkNextShortenCursor(phase, feedback, shortenCursor),
      Core.shrinkNextPaidCursor(phase, feedback, paidCursor),
      Core.shrinkNextRaiseCursor(phase, feedback, raiseCursor),
      Core.shrinkNextOrdinal(phase, feedback, ordinal),
      Core.shrinkNextShrinks(phase, feedback, shrinks),
      Core.shrinkNextStall(stall, feedback),
    ];
  }

  return { verified, best, accepted, shrinks };
}

/**
 * Every clone position in a family, outermost first, as the index path from the
 * family's own stream down to the clone.
 *
 * A path rather than a reference because each candidate re-runs the property
 * and so builds a whole new family: the case a path names survives that, a
 * reference into the previous run does not.
 */
function clonePaths(draws: readonly Draw[], prefix: readonly number[] = []): number[][] {
  const paths: number[][] = [];
  draws.forEach((draw, at) => {
    if (draw.kind !== "clone") return;
    const path = [...prefix, at];
    paths.push(path);
    paths.push(...clonePaths(draw.child.draws, path));
  });
  return paths;
}

/** Walk a path from a family to the clone stream it names. */
function caseAt(family: TestCase, path: readonly number[]): TestCase | null {
  let at = family;
  for (const index of path) {
    const draw = at.draws[index];
    if (draw === undefined || draw.kind !== "clone") return null;
    at = draw.child;
  }
  return at;
}

/**
 * Rebuild stream with the clone named by path carrying inner.
 *
 * This is the extract-and-splice the structural core is built around
 * (ir/structure.zir): the bytes inside a clone entry are already a well-formed
 * choice stream, so descending is one extraction per level and the recursion
 * lives here rather than in the IR, which forbids it.
 */
function spliceAt(
  stream: Uint8Array,
  path: readonly number[],
  inner: Uint8Array,
): Uint8Array | null {
  const offset = Core.choiceOffsetAt(stream, BigInt(path[0]));
  if (offset === null) return null;
  let payload = inner;
  if (path.length > 1) {
    const nested = Core.cloneInnerStream(stream, offset);
    if (nested === null) return null;
    const rebuilt = spliceAt(nested, path.slice(1), inner);
    if (rebuilt === null) return null;
    payload = rebuilt;
  }
  return Core.cloneReplaceInner(stream, offset, payload);
}

/**
 * The level that shrinks the stream inside one clone.
 *
 * Every candidate is spliced into the family's stream at the clone's position
 * and replayed through the whole property, so what is judged is the family's
 * outcome — the child's choices matter only through the failure they still
 * produce. The realized child stream is then read back out of that run.
 */
function cloneLevel(property: Property, family: TestCase, path: readonly number[]): ShrinkLevel {
  const stream = serializedDraws(family.draws);
  return (candidate: Uint8Array): ShrinkRun => {
    const spliced = spliceAt(stream, path, candidate);
    if (spliced === null) return { family, subject: family, error: null };
    const [error, testCase] = execute(property, { replay: spliced });
    const subject = caseAt(testCase, path);
    // The candidate changed the shape of the run: whatever it is, it is not
    // this clone's stream any more, so there is nothing to adopt.
    if (subject === null) return { family: testCase, subject: testCase, error: null };
    return { family: testCase, subject, error };
  };
}

/**
 * Run the whole schedule inside each clone of a family.
 *
 * The flat passes treat a clone entry as one atomic choice — they can delete it
 * or move it, never reach the choices inside it — so a failure that depends on
 * a value drawn from a clone would otherwise be reported exactly as generation
 * found it. Each clone gets its own run of the same compiled driver over its
 * own stream, which is upstream's shrink_clone_streams.
 */
function shrinkCloneStreams(
  property: Property,
  family: TestCase,
  origin: string | null,
  options: { maxShrinks?: bigint; maxStall?: bigint },
): { family: TestCase; improved: boolean } {
  let improved = false;
  for (const path of clonePaths(family.draws)) {
    const subject = caseAt(family, path);
    if (subject === null || subject.draws.length === 0) continue;
    const run = shrinkStream(
      property,
      cloneLevel(property, family, path),
      family,
      subject,
      origin,
      options,
    );
    if (run.accepted) {
      family = run.best;
      improved = true;
    }
  }
  return { family, improved };
}

/**
 * Minimize a failing example: the family's own stream first, then the stream
 * inside each of its clones, to a fixpoint.
 *
 * The two alternate because they feed each other — a deletion at the top can
 * expose a clone worth descending into, and a smaller child stream can make a
 * parent candidate legal that was not before. Each accepted candidate is
 * strictly simpler than the one it replaces, so the alternation terminates.
 */
export function shrink(
  property: Property,
  initial: TestCase,
  origin: string | null = null,
  options: { maxShrinks?: bigint; maxStall?: bigint } = {},
): [unknown, TestCase] {
  const level = familyLevel(property);
  for (;;) {
    const run = shrinkStream(property, level, initial, initial, origin, options);
    if (run.verified === null) {
      throw new Error("internal error: shrink finished without verifying");
    }
    const descended = shrinkCloneStreams(property, run.best, origin, options);
    // A sweep that improved the stream goes round again even when no clone
    // did, unless it stopped at its shrink cap: a later pass's accept can make
    // an earlier pass's candidate legal, and one sweep never revisits it. A
    // state machine needs this most, because a continue decision misread
    // after a deletion stops the run, so lowering a rule is often what lets a
    // whole step go.
    const again = Core.shrinkSweepAgain(run.accepted, run.shrinks, options.maxShrinks ?? 0n);
    if (!descended.improved && !again) return run.verified;
    initial = descended.family;
  }
}

// ---------- entry point ----------

/**
 * A label a completed run must have observed. A zero (or omitted) percent
 * requires the label's condition to have held in at least one valid example;
 * a positive percent requires at least that share of them.
 */
export interface Coverage {
  label: string;
  percent?: number;
}

export interface CheckOptions {
  examples?: number;
  /** Initial rejection allowance; each valid example earns 100 more. */
  maxRejections?: number;
  suppressFilterTooMuch?: boolean;
  suppressDataTooLarge?: boolean;
  suppressLargeBaseExample?: boolean;
  suppressTooSlow?: boolean;
  /** Zero disables the corresponding shrink cap. */
  maxShrinks?: bigint | number;
  maxStall?: bigint | number;
  seed?: bigint | number;
  reproduce?: string;
  /** Reuse and store raw counterexample streams; disabled unless requested. */
  database?: DatabaseOption;
  /** Portable property name used by the database. Defaults to the function name. */
  databaseKey?: string;
  /**
   * Labels the completed run must have covered, whether or not any call site
   * for them ever executed. See TestCase.cover.
   */
  require?: readonly Coverage[];
}

// One label's run-level coverage. Declared requirements are registered before
// the first example and observed-only labels in first-observation order, which
// is also the order verdicts are checked in — so shells that agree on the
// counters agree on the label a failure names.
interface CoverageCounter {
  label: string;
  permille: number;
  observed: number;
}

/**
 * Run `property` until it has seen `examples` valid examples, or throw a
 * {@link Failure} carrying a shrunk counterexample and a portable reproduce
 * blob. With `reproduce`, replay that blob instead of exploring.
 */
export function check(property: Property, options: CheckOptions = {}): void {
  if (property.constructor.name === "AsyncFunction") {
    throw new AsyncPropertyError("check requires a synchronous property");
  }
  const {
    examples = 100,
    maxRejections = 458,
    suppressFilterTooMuch = false,
    suppressDataTooLarge = false,
    suppressLargeBaseExample = false,
    suppressTooSlow = false,
    maxShrinks = 500,
    maxStall = 200,
    seed,
    reproduce,
    database: databaseOption,
    databaseKey: configuredDatabaseKey,
    require = [],
  } = options;
  const shrinkLimit = BigInt(maxShrinks);
  const stallLimit = BigInt(maxStall);
  if (examples <= 0) throw new RangeError("examples must be positive");
  if (maxRejections < 0) throw new RangeError("maxRejections must be non-negative");
  if (shrinkLimit < 0n) throw new RangeError("maxShrinks must be non-negative");
  if (stallLimit < 0n) throw new RangeError("maxStall must be non-negative");
  for (const required of require) {
    const percent = required.percent ?? 0;
    if (!(percent >= 0 && percent <= 100)) {
      throw new RangeError("required coverage percent must be between 0 and 100");
    }
  }

  if (reproduce !== undefined) {
    const raw = Core.rawFailureDecode(asciiBytes(reproduce));
    if (raw === null) throw new InvalidReplay("invalid or unsupported reproduce blob");

    const [error, replayCase] = execute(property, { replay: raw });
    if (error instanceof AsyncPropertyError) throw error;
    if (error === null) throw new InvalidReplay("reproduced example did not fail");
    if (error instanceof AssumptionRejected) {
      throw new InvalidReplay("reproduced example was rejected by an assumption");
    }
    if (error instanceof ReplayOverrun || error instanceof InvalidReplay) throw error;

    throw new Failure(
      reproduce, error, 1, 0, replayCase.notes, replayCase.puns, replayCase.keyMisses, replayCase.costs);
  }

  const database = resolveDatabase(databaseOption);
  const databaseKey = configuredDatabaseKey ?? (property.name || "<anonymous>");

  const counters: CoverageCounter[] = [];
  const counterIndex = new Map<string, number>();
  for (const required of require) {
    const permille = Math.trunc((required.percent ?? 0) * 10);
    const at = counterIndex.get(required.label);
    if (at !== undefined) {
      counters[at].permille = Math.max(counters[at].permille, permille);
      continue;
    }
    counterIndex.set(required.label, counters.length);
    counters.push({ label: required.label, permille, observed: 0 });
  }
  const rng = new Rng(seed ?? randomSeed());
  let valid = 0;
  let attempts = 0;
  // Database replays are attempts but not generation. The schedule is told
  // generation's own count, so a stale entry cannot take the all-simplest
  // probe's place as the first request.
  let replays = 0;
  let rejections = 0;
  let overruns = 0;
  let generationMicros = 0n;
  const pendingMutations: Uint8Array[] = [];
  // Consecutive executed mutation requests; the schedule caps it at one brood
  // so fresh random generation keeps its share of the run.
  let mutationStreak = 0n;
  const seenStreams = new StreamSet();
  // Per-label best score and the stream that produced it, for the targeting
  // hill climber. The schedule, budgets, record and accept rules, stepping,
  // and the step-size search are all compiled (ir/targeting.zir); this loop
  // holds the maps and runs the trials.
  const targetingBest = new Map<string, { score: number; stream: Uint8Array }>();
  const targetingStep = Core.targetingScheduleStep(BigInt(examples));
  let targetingNextAt = targetingStep;
  const targetingBudget = Core.targetingTrialBudget(BigInt(examples));

  // Fold a valid example's targeting observations into the per-label bests.
  const recordTargets = (testCase: TestCase): void => {
    for (const [label, score] of testCase.root().targets) {
      const entry = targetingBest.get(label);
      if (Core.targetingRecord(entry !== undefined, entry?.score ?? 0, score)) {
        targetingBest.set(label, { score, stream: testCase.serialized() });
      }
    }
  };

  // Shrink a failing case and throw the failure — the tail of the generation
  // loop and a failing targeting trial report through the same path. A replay
  // during the search that stops failing is reported as Flaky, carrying the
  // failure as found rather than a shrunk one that cannot be trusted; nothing
  // is stored or collected for it.
  const reportCounterexample = (
    testCase: TestCase,
    error: unknown,
    replaced?: Uint8Array,
  ): never => {
    let shrunk: [unknown, TestCase];
    try {
      shrunk = shrink(
        property,
        testCase,
        interestingOrigin(error),
        { maxShrinks: shrinkLimit, maxStall: stallLimit },
      );
    } catch (caught) {
      if (!(caught instanceof FlakyReplay)) throw caught;
      throw new Flaky(
        Core.rawFailureEncode(testCase.serialized()), error, attempts, rejections);
    }
    const [shrunkError, shrunkCase] = shrunk;
    const stream = shrunkCase.serialized();
    if (database !== null) {
      database.save(databaseKey, stream);
      if (replaced !== undefined && !sameBytes(replaced, stream)) {
        database.delete(databaseKey, replaced);
      }
    }
    const blob = Core.rawFailureEncode(stream);
    throw new Failure(
      blob, shrunkError, attempts, rejections, shrunkCase.notes, shrunkCase.puns,
      shrunkCase.keyMisses, shrunkCase.costs);
  };

  // One targeting trial: replay a stepped stream with fresh-RNG extension —
  // the execution mode mutation probes already use — counting it as an
  // ordinary attempt. Answers null when the firing's budget is spent.
  const targetingTrial = (
    stream: Uint8Array,
  ): [unknown, TestCase, bigint] | null => {
    if (BigInt(valid) >= BigInt(examples) || BigInt(attempts) >= targetingBudget) {
      return null;
    }
    attempts++;
    const [error, testCase] = execute(property, { rng, replay: stream });
    if (error instanceof AsyncPropertyError) throw error;
    seenStreams.insert(serializedDraws(testCase.draws));
    if (error === null) {
      valid++;
      recordTargets(testCase);
    }
    return [error, testCase, classify(error)];
  };

  // Hill-climb one label's best-known stream: walk its realized draws from
  // the end backwards, stepping each climbable draw through the compiled
  // step-size search, in the +k direction and then -k. A failing trial
  // reports through the ordinary counterexample path. Mirrors
  // hegel-c/src/native/targeting.rs::hill_climb.
  const targetingClimb = (label: string, allowance: bigint): bigint => {
    const trial = targetingTrial(targetingBest.get(label)!.stream);
    if (trial === null) return 0n;
    const [error, first, outcome] = trial;
    if (outcome === OUTCOME_INTERESTING) reportCounterexample(first, error);
    if (error !== null) return 0n;

    let current = first;
    let currentScore = current.root().targets.get(label) ?? -Infinity;
    let improvements = 0n;
    const examined = new Set<number>();
    let at = current.draws.length - 1;
    let previousLength = current.draws.length;
    while (at >= 0 && improvements <= allowance) {
      if (current.draws.length !== previousLength) {
        at = current.draws.length - 1;
        previousLength = current.draws.length;
        continue;
      }
      if (examined.has(at)) {
        at--;
        continue;
      }
      examined.add(at);
      if (climbableDraw(current.draws[at])) {
        const lengthBefore = current.draws.length;
        for (const direction of [1n, -1n]) {
          // The -k direction only makes sense while the draw survived the +k
          // climb at the same index with the stream length unchanged.
          if (
            direction === -1n &&
            (at >= current.draws.length || current.draws.length !== lengthBefore)
          ) {
            break;
          }
          let mode = 0n;
          let a = 1n;
          let b = 0n;
          while (true) {
            // A committed improvement may have shortened the stream below
            // this index; the outer walk restarts from the new end.
            if (at >= current.draws.length) break;
            const probe = Core.findIntegerProbe(mode, a, b);
            if (probe === null) break;
            let committed = false;
            if (probe <= Core.targetingStepCap()) {
              const stepped = stepDraw(current.draws[at], direction * probe);
              if (stepped !== null) {
                const draws = current.draws.slice();
                draws[at] = stepped;
                const stepTrial = targetingTrial(serializedDraws(draws));
                if (stepTrial === null) break;
                const [trialError, trialCase, trialOutcome] = stepTrial;
                if (trialOutcome === OUTCOME_INTERESTING) {
                  reportCounterexample(trialCase, trialError);
                }
                if (trialError === null) {
                  const trialScore = trialCase.root().targets.get(label) ?? -Infinity;
                  const accept = Core.targetingAccept(
                    trialScore,
                    currentScore,
                    flatDrawCount(trialCase.draws),
                    flatDrawCount(current.draws),
                  );
                  if (accept !== 0n) {
                    current = trialCase;
                    currentScore = trialScore;
                    if (accept === 2n) improvements++;
                    committed = true;
                  }
                }
              }
            }
            [mode, a, b] = [
              Core.findIntegerNextMode(mode, a, b, committed),
              Core.findIntegerNextA(mode, a, b, committed),
              Core.findIntegerNextB(mode, a, b, committed),
            ];
          }
        }
      }
      at--;
    }
    return improvements;
  };

  // Climb every label until a full round improves nothing or the budget is
  // spent. Mirrors targeting.rs::optimise_targets, with the improvement
  // allowance doubling each round.
  const optimiseTargets = (): void => {
    let round = 0n;
    while (true) {
      const callsBefore = attempts;
      let anyImprovements = false;
      const allowance = Core.targetingImprovementAllowance(round);
      for (const label of [...targetingBest.keys()].sort()) {
        if (targetingClimb(label, allowance) > 0n) anyImprovements = true;
      }
      round++;
      if (!anyImprovements || attempts === callsBefore) return;
    }
  };

  // Stored failures replay before generation. Replays count as attempts but
  // consume neither the exploration budget nor coverage/health accounting.
  if (database !== null) {
    const stored = [...database.fetch(databaseKey)].sort(shortlexCompare);
    for (const entry of stored) {
      if (!Core.choiceStreamValidate(entry)) {
        database.delete(databaseKey, entry);
        continue;
      }
      attempts++;
      replays++;
      const [error, testCase] = execute(property, { replay: entry });
      if (error instanceof AsyncPropertyError) throw error;
      if (classify(error) !== OUTCOME_INTERESTING) {
        database.delete(databaseKey, entry);
        continue;
      }
      reportCounterexample(testCase, error, entry);
    }
  }

  while (Core.generationShouldContinue(BigInt(valid), BigInt(examples))) {
    const request = Core.generationRequestKind(
      BigInt(attempts - replays),
      BigInt(pendingMutations.length),
      mutationStreak,
    );
    const simplestProbe = request === 1n;
    const mutationProbe = request === 2n;
    const mutation = mutationProbe ? pendingMutations.shift() : undefined;
    const novelty = Core.generationNoveltyAction(
      request,
      mutationProbe && seenStreams.contains(mutation!),
    );
    if (novelty === 0n) continue;
    if (novelty === 2n) seenStreams.insert(mutation!);
    attempts++;
    mutationStreak = mutationProbe ? mutationStreak + 1n : 0n;
    const [error, testCase] = execute(
      property,
      simplestProbe ? { simplest: true } : { rng, replay: mutation },
    );
    if (error instanceof AsyncPropertyError) throw error;
    seenStreams.insert(serializedDraws(testCase.draws));
    const caseGenerationMicros = testCase.generationTimeMicros();
    const maximumMicros = (1n << 64n) - 1n;
    generationMicros = generationMicros > maximumMicros - caseGenerationMicros
      ? maximumMicros
      : generationMicros + caseGenerationMicros;
    const outcome = classify(error);
    if (Core.healthLargeBaseExample(
      error instanceof ChoiceOverrun,
      outcome,
      BigInt(testCase.draws.length),
      suppressLargeBaseExample,
    )) {
      throw new FailedHealthCheck(
        "large_base_example",
        "large_base_example: the simplest natural input is too large",
      );
    }
    const healthValid = valid + (error === null ? 1 : 0);
    if (outcome !== 4n && Core.healthTooSlow(
      generationMicros,
      BigInt(healthValid),
      suppressTooSlow,
    )) {
      throw new FailedHealthCheck(
        "too_slow",
        "too_slow: input generation exceeded one cumulative second " +
          `while only ${healthValid} valid inputs were generated`,
      );
    }
    if (error === null) {
      valid++;
      // An example that reached a label the run has barely covered is on the
      // frontier, so its mutation proposals jump the queue ahead of ones bred
      // from the common path, and may be bred at all when the base rule
      // declines.
      let heldRare = false;
      for (const [label, observation] of testCase.coverage) {
        let at = counterIndex.get(label);
        if (at === undefined) {
          at = counters.length;
          counterIndex.set(label, at);
          counters.push({ label, permille: 0, observed: 0 });
        }
        const counter = counters[at];
        counter.permille = Math.max(counter.permille, observation.permille);
        if (observation.held) {
          counter.observed++;
          if (Core.generationLabelRare(
            BigInt(counter.observed),
            BigInt(valid),
            BigInt(counter.permille),
          )) {
            heldRare = true;
          }
        }
      }
      const admission = Core.generationMutationAdmission(
        request,
        BigInt(valid),
        BigInt(pendingMutations.length),
        heldRare,
      );
      if (admission !== 0n) {
        const proposals = spanMutationCandidates(testCase.draws, testCase.spans, rng);
        if (admission === 2n) {
          pendingMutations.unshift(...proposals);
        } else {
          pendingMutations.push(...proposals);
        }
      }
      // Targeting: fold this example's observations in, and fire the hill
      // climber when the schedule says so. A failing trial is a
      // counterexample like any other.
      recordTargets(testCase);
      if (
        targetingBest.size > 0 &&
        Core.targetingShouldFire(BigInt(valid), targetingNextAt)
      ) {
        targetingNextAt = Core.targetingNextThreshold(targetingNextAt, targetingStep);
        optimiseTargets();
      }
      continue;
    }
    if (error instanceof AssumptionRejected) {
      rejections++;
      const rejectionLimit = Core.generationRejectionLimit(
        BigInt(maxRejections),
        BigInt(valid),
      );
      if (BigInt(rejections + overruns) > rejectionLimit) {
        throw new TooManyRejections(rejections + overruns, Number(rejectionLimit));
      }
      if (Core.healthFilterTooMuch(
        BigInt(rejections),
        BigInt(valid),
        suppressFilterTooMuch,
      )) {
        throw new FailedHealthCheck(
          "filter_too_much",
          `filter_too_much: ${rejections} inputs were rejected by assumptions ` +
            `while only ${valid} valid inputs were generated`,
        );
      }
      continue;
    }
    if (error instanceof ChoiceOverrun) {
      overruns++;
      const rejectionLimit = Core.generationRejectionLimit(
        BigInt(maxRejections),
        BigInt(valid),
      );
      if (BigInt(rejections + overruns) > rejectionLimit) {
        throw new TooManyRejections(rejections + overruns, Number(rejectionLimit));
      }
      if (Core.healthDataTooLarge(
        BigInt(overruns),
        BigInt(valid),
        suppressDataTooLarge,
      )) {
        throw new FailedHealthCheck(
          "data_too_large",
          `data_too_large: ${overruns} inputs exceeded the choice budget ` +
            `while only ${valid} valid inputs were generated`,
        );
      }
      continue;
    }
    if (error instanceof InvalidReplay) throw error;

    reportCounterexample(testCase, error);
  }
  // The coverage verdict runs only on a run that completed fully valid: a
  // counterexample or an aborted run reports that instead, and a verdict about
  // a truncated run would be noise. The accept rule is compiled
  // (ir/lifecycle.zir @coverage_failed) so every shell agrees on it.
  for (const counter of counters) {
    if (Core.coverageFailed(BigInt(counter.observed), BigInt(valid), BigInt(counter.permille))) {
      throw new FailedCoverage(counter.label, counter.observed, valid, counter.permille / 10);
    }
  }
}

function randomSeed(): bigint {
  let seed = 0n;
  for (let i = 0; i < 8; i++) {
    seed = (seed << 8n) | BigInt(Math.floor(Math.random() * 256));
  }
  return seed;
}
