// Portable generators.
//
// The semantics are shared across languages and the spelling is native:
// TypeScript gets an options object at the factory boundary plus immutable
// fluent builders for incremental composition. The two forms are equivalent.

import * as Core from "./zizek_gen.ts";
import { alphabet } from "./shell.ts";
import type { Generator, IntLike, TestCase } from "./shell.ts";

const DEFAULT_BIGINT_MIN = -(1n << 63n);
const DEFAULT_BIGINT_MAX = (1n << 63n) - 1n;
const MAX_INTEGER_CARDINALITY = 1n << 64n;

function big(value: IntLike): bigint {
  return typeof value === "bigint" ? value : BigInt(value);
}

function validateIntegerBounds(minimum: bigint, maximum: bigint): void {
  if (minimum > maximum) throw new RangeError("minimum must be <= maximum");
  if (maximum - minimum >= MAX_INTEGER_CARDINALITY) {
    throw new RangeError("integer interval may contain at most 2^64 values");
  }
}

function validateSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a safe integer`);
  }
}

function validateSafeIntegerBounds(minimum: number, maximum: number): void {
  validateSafeInteger(minimum, "minimum");
  validateSafeInteger(maximum, "maximum");
  if (minimum > maximum) throw new RangeError("minimum must be <= maximum");
}

function validateBigSizeBounds(minimum: bigint, maximum: bigint | null): void {
  if (minimum < 0n || (maximum !== null && minimum > maximum)) {
    throw new RangeError("require 0 <= minimum <= maximum");
  }
}

function validateSizeBounds(minimum: number, maximum: number | null): void {
  if (
    !Number.isSafeInteger(minimum) || minimum < 0 ||
    (maximum !== null && (!Number.isSafeInteger(maximum) || minimum > maximum))
  ) {
    throw new RangeError("require non-negative safe integers with minimum <= maximum");
  }
}

export interface IntegerOptions {
  min?: number;
  max?: number;
  shrinkTowards?: number;
}

/** Safe JavaScript integers, drawn through the exact bigint choice layer. */
export class IntegerGenerator implements Generator<number> {
  readonly minimum: number;
  readonly maximum: number;
  readonly target: number | null;

  constructor(
    minimum = Number.MIN_SAFE_INTEGER,
    maximum = Number.MAX_SAFE_INTEGER,
    target: number | null = null,
  ) {
    validateSafeIntegerBounds(minimum, maximum);
    if (target !== null) validateSafeInteger(target, "shrink target");
    this.minimum = minimum;
    this.maximum = maximum;
    this.target = target;
  }

  minValue(value: number): IntegerGenerator {
    return new IntegerGenerator(value, this.maximum, this.target);
  }

  maxValue(value: number): IntegerGenerator {
    return new IntegerGenerator(this.minimum, value, this.target);
  }

  shrinkTowards(value: number): IntegerGenerator {
    return new IntegerGenerator(this.minimum, this.maximum, value);
  }

  doDraw(testCase: TestCase): number {
    // An explicit destination is passed through unclamped: integerSimplest
    // already clamps it to the nearer bound. The default is compiled so the
    // shells cannot drift on it.
    const low = BigInt(this.minimum);
    const high = BigInt(this.maximum);
    const destination = this.target === null
      ? Core.integerDefaultShrinkTarget(low, high)
      : BigInt(this.target);
    return Number(testCase.integer(low, high, destination));
  }
}

export interface BigIntegerOptions {
  min?: bigint;
  max?: bigint;
  shrinkTowards?: bigint;
}

/** Exact integers represented as JavaScript bigint values. */
export class BigIntegerGenerator implements Generator<bigint> {
  readonly minimum: bigint;
  readonly maximum: bigint;
  readonly target: bigint | null;

  constructor(
    minimum = DEFAULT_BIGINT_MIN,
    maximum = DEFAULT_BIGINT_MAX,
    target: bigint | null = null,
  ) {
    validateIntegerBounds(minimum, maximum);
    this.minimum = minimum;
    this.maximum = maximum;
    this.target = target;
  }

  minValue(value: bigint): BigIntegerGenerator {
    return new BigIntegerGenerator(value, this.maximum, this.target);
  }

  maxValue(value: bigint): BigIntegerGenerator {
    return new BigIntegerGenerator(this.minimum, value, this.target);
  }

  shrinkTowards(value: bigint): BigIntegerGenerator {
    return new BigIntegerGenerator(this.minimum, this.maximum, value);
  }

  doDraw(testCase: TestCase): bigint {
    const destination = this.target ??
      Core.integerDefaultShrinkTarget(this.minimum, this.maximum);
    return testCase.integer(this.minimum, this.maximum, destination);
  }
}

export interface TextOptions {
  minSize?: IntLike;
  maxSize?: IntLike;
  /** The characters to draw from, or an interval set from alphabetRange. */
  alphabet?: string | Uint8Array;
}

/**
 * Text over an alphabet, by default every Unicode scalar value. Values shrink
 * shortlex over the alphabet's shrink order — shorter first, then towards "0",
 * the digits, and the uppercase letters — so a minimal failing string is one a
 * reader can retype.
 */
export class TextGenerator implements Generator<string> {
  readonly minimum: bigint;
  readonly maximum: bigint | null;
  readonly characters: Uint8Array | null;

  constructor(
    minimum = 0n,
    maximum: bigint | null = null,
    characters: Uint8Array | null = null,
  ) {
    validateBigSizeBounds(minimum, maximum);
    this.minimum = minimum;
    this.maximum = maximum;
    this.characters = characters;
  }

  minSize(value: IntLike): TextGenerator {
    return new TextGenerator(big(value), this.maximum, this.characters);
  }

  maxSize(value: IntLike): TextGenerator {
    return new TextGenerator(this.minimum, big(value), this.characters);
  }

  alphabet(characters: string | Uint8Array): TextGenerator {
    return new TextGenerator(
      this.minimum,
      this.maximum,
      typeof characters === "string" ? alphabet(characters) : characters,
    );
  }

  doDraw(testCase: TestCase): string {
    const limit = this.maximum ?? Core.textWidenedMax(this.minimum);
    return testCase.string(this.minimum, limit, this.characters);
  }
}

export interface FloatOptions {
  min?: number;
  max?: number;
  allowNan?: boolean;
  allowInfinity?: boolean;
  smallestNonzeroMagnitude?: number;
}

export class FloatGenerator implements Generator<number> {
  readonly minimum: number;
  readonly maximum: number;
  readonly allowNanValues: boolean;
  readonly allowInfinityValues: boolean;
  readonly smallestNonzero: number;

  constructor(
    minimum = -Infinity,
    maximum = Infinity,
    allowNanValues = false,
    allowInfinityValues = false,
    smallestNonzero = 0,
  ) {
    if (
      !Core.floatGenerationSpecValid(
        minimum,
        maximum,
        allowNanValues,
        allowInfinityValues,
        smallestNonzero,
      )
    ) {
      throw new RangeError("invalid float bounds");
    }
    if (
      Core.floatUnit(
        minimum,
        maximum,
        allowNanValues,
        allowInfinityValues,
        smallestNonzero,
      ) === null
    ) {
      throw new RangeError("float configuration admits no values");
    }
    this.minimum = minimum;
    this.maximum = maximum;
    this.allowNanValues = allowNanValues;
    this.allowInfinityValues = allowInfinityValues;
    this.smallestNonzero = smallestNonzero;
  }

  private copy(changes: FloatOptions): FloatGenerator {
    return new FloatGenerator(
      changes.min ?? this.minimum,
      changes.max ?? this.maximum,
      changes.allowNan ?? this.allowNanValues,
      changes.allowInfinity ?? this.allowInfinityValues,
      changes.smallestNonzeroMagnitude ?? this.smallestNonzero,
    );
  }

  minValue(value: number): FloatGenerator {
    return this.copy({ min: value });
  }

  maxValue(value: number): FloatGenerator {
    return this.copy({ max: value });
  }

  allowNan(value = true): FloatGenerator {
    return this.copy({ allowNan: value });
  }

  allowInfinity(value = true): FloatGenerator {
    return this.copy({ allowInfinity: value });
  }

  smallestNonzeroMagnitude(value: number): FloatGenerator {
    return this.copy({ smallestNonzeroMagnitude: value });
  }

  doDraw(testCase: TestCase): number {
    return testCase.float(this.minimum, this.maximum, {
      allowNan: this.allowNanValues,
      allowInfinity: this.allowInfinityValues,
      smallestNonzeroMagnitude: this.smallestNonzero,
    });
  }
}

export interface ListOptions {
  minSize?: number;
  maxSize?: number;
}

export class ListGenerator<T> implements Generator<T[]> {
  readonly element: Generator<T>;
  readonly minimum: number;
  readonly maximum: number | null;

  constructor(element: Generator<T>, minimum = 0, maximum: number | null = null) {
    validateSizeBounds(minimum, maximum);
    this.element = element;
    this.minimum = minimum;
    this.maximum = maximum;
  }

  minSize(value: number): ListGenerator<T> {
    return new ListGenerator(this.element, value, this.maximum);
  }

  maxSize(value: number): ListGenerator<T> {
    return new ListGenerator(this.element, this.minimum, value);
  }

  doDraw(testCase: TestCase): T[] {
    return testCase.collect(this.element, this.minimum, this.maximum, "list.element");
  }
}

export function integers(options: IntegerOptions = {}): IntegerGenerator {
  return new IntegerGenerator(
    options.min ?? Number.MIN_SAFE_INTEGER,
    options.max ?? Number.MAX_SAFE_INTEGER,
    options.shrinkTowards ?? null,
  );
}

export function bigIntegers(options: BigIntegerOptions = {}): BigIntegerGenerator {
  return new BigIntegerGenerator(
    options.min ?? DEFAULT_BIGINT_MIN,
    options.max ?? DEFAULT_BIGINT_MAX,
    options.shrinkTowards ?? null,
  );
}

export function text(options: TextOptions = {}): TextGenerator {
  const characters = options.alphabet === undefined
    ? null
    : typeof options.alphabet === "string" ? alphabet(options.alphabet) : options.alphabet;
  return new TextGenerator(
    options.minSize === undefined ? 0n : big(options.minSize),
    options.maxSize === undefined ? null : big(options.maxSize),
    characters,
  );
}

export type CharacterOptions = Pick<TextOptions, "alphabet">;

/** Generate exactly one Unicode scalar value. */
export function characters(options: CharacterOptions = {}): TextGenerator {
  return text({ minSize: 1, maxSize: 1, alphabet: options.alphabet });
}

// Unlike the scalar generators this one has structure the shrinker can reduce:
// it deletes whole elements before it simplifies the values inside them, so a
// failing list minimizes towards the shortest list that still fails rather
// than towards small elements in a long list.
export function lists<T>(element: Generator<T>, options: ListOptions = {}): ListGenerator<T> {
  return new ListGenerator(
    element,
    options.minSize ?? 0,
    options.maxSize ?? null,
  );
}

/** TypeScript-native alias for lists. */
export function arrays<T>(element: Generator<T>, options: ListOptions = {}): ListGenerator<T> {
  return lists(element, options);
}

export interface UniqueOptions<T, K> extends ListOptions {
  uniqueBy?: (value: T) => K;
}

// A variable-length collection whose elements are distinct under a key.
export class UniqueListGenerator<T, K> implements Generator<T[]> {
  readonly element: Generator<T>;
  readonly key: ((value: T) => K) | null;
  readonly minimum: number;
  readonly maximum: number | null;
  readonly label: string;

  constructor(
    element: Generator<T>,
    key: ((value: T) => K) | null = null,
    minimum = 0,
    maximum: number | null = null,
    label = "list.element",
  ) {
    validateSizeBounds(minimum, maximum);
    this.element = element;
    this.key = key;
    this.minimum = minimum;
    this.maximum = maximum;
    this.label = label;
  }

  minSize(value: number): UniqueListGenerator<T, K> {
    return new UniqueListGenerator(this.element, this.key, value, this.maximum, this.label);
  }

  maxSize(value: number): UniqueListGenerator<T, K> {
    return new UniqueListGenerator(this.element, this.key, this.minimum, value, this.label);
  }

  doDraw(testCase: TestCase): T[] {
    return testCase.collectUnique(this.element, this.key, this.minimum, this.maximum, this.label);
  }
}

// A Set of distinct values.
export class SetGenerator<T> implements Generator<Set<T>> {
  readonly element: Generator<T>;
  readonly minimum: number;
  readonly maximum: number | null;

  constructor(element: Generator<T>, minimum = 0, maximum: number | null = null) {
    validateSizeBounds(minimum, maximum);
    this.element = element;
    this.minimum = minimum;
    this.maximum = maximum;
  }

  minSize(value: number): SetGenerator<T> {
    return new SetGenerator(this.element, value, this.maximum);
  }

  maxSize(value: number): SetGenerator<T> {
    return new SetGenerator(this.element, this.minimum, value);
  }

  doDraw(testCase: TestCase): Set<T> {
    return new Set(
      testCase.collectUnique<T, T>(this.element, null, this.minimum, this.maximum, "set.element"),
    );
  }
}

// A Map whose keys are distinct. The pair is drawn as a unit so that deleting
// its span deletes both halves together.
export class MapGenerator<K, V> implements Generator<Map<K, V>> {
  readonly keys: Generator<K>;
  readonly values: Generator<V>;
  readonly minimum: number;
  readonly maximum: number | null;

  constructor(
    keys: Generator<K>,
    values: Generator<V>,
    minimum = 0,
    maximum: number | null = null,
  ) {
    validateSizeBounds(minimum, maximum);
    this.keys = keys;
    this.values = values;
    this.minimum = minimum;
    this.maximum = maximum;
  }

  minSize(value: number): MapGenerator<K, V> {
    return new MapGenerator(this.keys, this.values, value, this.maximum);
  }

  maxSize(value: number): MapGenerator<K, V> {
    return new MapGenerator(this.keys, this.values, this.minimum, value);
  }

  doDraw(testCase: TestCase): Map<K, V> {
    const pairs: Generator<[K, V]> = {
      doDraw: (inner: TestCase): [K, V] => [
        inner.draw(this.keys),
        inner.draw(this.values),
      ],
    };
    return new Map(
      testCase.collectUnique<[K, V], K>(
        pairs,
        (entry) => entry[0],
        this.minimum,
        this.maximum,
        "map.entry",
      ),
    );
  }
}

// Generate a list whose elements have distinct keys.
//
// A duplicate costs the element, not the example: the candidate's choices are
// discarded and another is drawn. See TestCase.collectUnique.
export function uniqueLists<T, K>(
  element: Generator<T>,
  options: UniqueOptions<T, K> = {},
): UniqueListGenerator<T, K> {
  return new UniqueListGenerator(
    element,
    options.uniqueBy ?? null,
    options.minSize ?? 0,
    options.maxSize ?? null,
  );
}

// Generate a Set of distinct values.
//
// A set is a unique list the shrinker can still delete elements from: each
// element keeps its own span, and a candidate that duplicates an earlier one is
// discarded rather than failing the example.
export function sets<T>(element: Generator<T>, options: ListOptions = {}): SetGenerator<T> {
  return new SetGenerator(element, options.minSize ?? 0, options.maxSize ?? null);
}

// Generate a Map whose keys are distinct. Uniqueness is judged on the key alone,
// so the value generator is free to repeat.
export function maps<K, V>(
  keys: Generator<K>,
  values: Generator<V>,
  options: ListOptions = {},
): MapGenerator<K, V> {
  return new MapGenerator(keys, values, options.minSize ?? 0, options.maxSize ?? null);
}

export function floats(options: FloatOptions = {}): FloatGenerator {
  return new FloatGenerator(
    options.min ?? -Infinity,
    options.max ?? Infinity,
    options.allowNan ?? false,
    options.allowInfinity ?? false,
    options.smallestNonzeroMagnitude ?? 0,
  );
}

// ---------- scalars, constants, and combinators ----------
//
// None of the wrappers below records a choice of its own — only sampledFrom
// and oneOf do, and each records exactly one integer — so composing them
// leaves the reproduce blob byte-compatible with the other packages.

export class BooleanGenerator implements Generator<boolean> {
  doDraw(testCase: TestCase): boolean {
    return testCase.boolean();
  }
}

/** Generate booleans, shrinking towards false. */
export function booleans(): BooleanGenerator {
  return new BooleanGenerator();
}

export class WeightedBooleanGenerator implements Generator<boolean> {
  readonly probability: number;

  constructor(probability: number) {
    this.probability = probability;
  }

  doDraw(testCase: TestCase): boolean {
    return testCase.weighted(this.probability);
  }
}

/**
 * Generate booleans that are true with the given probability. Recorded as an
 * ordinary boolean choice: the weight biases generation only, so a blob
 * replays the same whatever probability produced it.
 */
export function weightedBooleans(probability: number): WeightedBooleanGenerator {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error("weightedBooleans requires a probability in [0, 1]");
  }
  return new WeightedBooleanGenerator(probability);
}

export interface BinaryOptions {
  minSize?: number;
  maxSize?: number;
}

export class BytesGenerator implements Generator<Uint8Array> {
  readonly minimum: number;
  readonly maximum: number;

  constructor(minimum = 0, maximum = 16) {
    validateSizeBounds(minimum, maximum);
    this.minimum = minimum;
    this.maximum = maximum;
  }

  minSize(value: number): BytesGenerator {
    return new BytesGenerator(value, this.maximum);
  }

  maxSize(value: number): BytesGenerator {
    return new BytesGenerator(this.minimum, value);
  }

  doDraw(testCase: TestCase): Uint8Array {
    return testCase.bytes(this.minimum, this.maximum);
  }
}

/** Generate byte strings, shrinking towards shorter and lower values. */
export function binary(options: BinaryOptions = {}): BytesGenerator {
  return new BytesGenerator(options.minSize ?? 0, options.maxSize ?? 16);
}

export class JustGenerator<T> implements Generator<T> {
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  doDraw(_testCase: TestCase): T {
    return this.value;
  }
}

/** Always produce one value, recording no choice. */
export function just<T>(value: T): JustGenerator<T> {
  return new JustGenerator(value);
}

/** Always produce null. */
export function none(): JustGenerator<null> {
  return new JustGenerator(null);
}

export class SampledGenerator<T> implements Generator<T> {
  readonly values: readonly T[];

  constructor(values: readonly T[]) {
    this.values = values;
  }

  doDraw(testCase: TestCase): T {
    // A real integer choice, so the index shrinks and replays like any other.
    return this.values[Number(testCase.integer(0, this.values.length - 1))];
  }
}

/** Pick one of a fixed sequence, shrinking towards the first element. */
export function sampledFrom<T>(values: readonly T[]): SampledGenerator<T> {
  if (values.length === 0) throw new Error("sampledFrom requires at least one value");
  return new SampledGenerator(values);
}

export class OneOfGenerator<T> implements Generator<T> {
  readonly choices: readonly Generator<T>[];

  constructor(choices: readonly Generator<T>[]) {
    this.choices = choices;
  }

  doDraw(testCase: TestCase): T {
    return this.choices[Number(testCase.integer(0, this.choices.length - 1))].doDraw(testCase);
  }
}

/** Draw from one of several generators, shrinking towards the first. */
export function oneOf<T>(...choices: Generator<T>[]): OneOfGenerator<T> {
  if (choices.length === 0) throw new Error("oneOf requires at least one generator");
  return new OneOfGenerator(choices);
}

/** Generate null or a value from the inner generator, shrinking towards null. */
export function optional<T>(inner: Generator<T>): OneOfGenerator<T | null> {
  return oneOf<T | null>(none(), inner);
}

export type TupleValues<Parts extends readonly Generator<unknown>[]> = {
  -readonly [Index in keyof Parts]: Parts[Index] extends Generator<infer Value> ? Value : never;
};

export class TupleGenerator<Parts extends readonly Generator<unknown>[]>
  implements Generator<TupleValues<Parts>>
{
  readonly parts: Parts;

  constructor(parts: Parts) {
    this.parts = parts;
  }

  doDraw(testCase: TestCase): TupleValues<Parts> {
    return this.parts.map((part) => part.doDraw(testCase)) as TupleValues<Parts>;
  }
}

/** Draw each generator in order and collect the values into an array. */
export function tuples<const Parts extends readonly Generator<unknown>[]>(
  ...parts: Parts
): TupleGenerator<Parts> {
  return new TupleGenerator(parts);
}

export class MappedGenerator<T, U> implements Generator<U> {
  readonly source: Generator<T>;
  readonly transform: (value: T) => U;

  constructor(source: Generator<T>, transform: (value: T) => U) {
    this.source = source;
    this.transform = transform;
  }

  doDraw(testCase: TestCase): U {
    return this.transform(this.source.doDraw(testCase));
  }
}

/** Apply a function to each value a generator draws. */
export function map<T, U>(source: Generator<T>, transform: (value: T) => U): MappedGenerator<T, U> {
  return new MappedGenerator(source, transform);
}

export class FlatMappedGenerator<T, U> implements Generator<U> {
  readonly source: Generator<T>;
  readonly transform: (value: T) => Generator<U>;

  constructor(source: Generator<T>, transform: (value: T) => Generator<U>) {
    this.source = source;
    this.transform = transform;
  }

  doDraw(testCase: TestCase): U {
    testCase.startSpan("flat_map");
    // An open span is closed for us when the execution unwinds.
    const value = this.source.doDraw(testCase);
    const result = this.transform(value).doDraw(testCase);
    testCase.stopSpan(false);
    return result;
  }
}

/**
 * Build the next generator from each drawn value — monadic bind. Both draws
 * share one "flat_map" span, so the shrinker can delete or simplify the whole
 * unit together: shrinking the source value changes which inner generator
 * runs, and the inner draws replay or pun by the ordinary prefix rules.
 */
export function flatMap<T, U>(
  source: Generator<T>,
  transform: (value: T) => Generator<U>,
): FlatMappedGenerator<T, U> {
  return new FlatMappedGenerator(source, transform);
}

export class FilteredGenerator<T> implements Generator<T> {
  readonly source: Generator<T>;
  readonly predicate: (value: T) => boolean;

  constructor(source: Generator<T>, predicate: (value: T) => boolean) {
    this.source = source;
    this.predicate = predicate;
  }

  doDraw(testCase: TestCase): T {
    // The attempt budget is the same one a unique collection spends per
    // element, so it comes from ir/many.zir rather than a constant here.
    let attempts = 0n;
    while (Core.filterRetryAllowed(attempts)) {
      const value = this.source.doDraw(testCase);
      attempts += 1n;
      if (this.predicate(value)) return value;
    }
    // A rejection discards the example rather than failing the property.
    testCase.assume(false);
    throw new Error("unreachable: assume(false) rejects the example");
  }
}

/** Keep only values satisfying a predicate, rejecting the example if none do. */
export function filter<T>(
  source: Generator<T>,
  predicate: (value: T) => boolean,
): FilteredGenerator<T> {
  return new FilteredGenerator(source, predicate);
}

/**
 * Build a generator from a function that draws as it goes:
 *
 *   const ordered = composite((draw) => {
 *     const low = draw(integers({ max: 10 }));
 *     return [low, draw(integers({ min: low }))];
 *   });
 */
export function composite<T>(build: (draw: <U>(g: Generator<U>) => U) => T): Generator<T> {
  return {
    doDraw(testCase: TestCase): T {
      return build(<U,>(generator: Generator<U>): U => testCase.draw(generator));
    },
  };
}

class RecursiveLeafBudget extends Error {}

type OpenBranch = { depth: bigint; children: bigint };

class RecursiveState {
  attempt = 0n;
  leaves = 0n;
  startPrice = 0;
  closedChildren = 0n;
  closedBranches = 0n;
  readonly openBranches: OpenBranch[] = [];
  reprices = 0n;
  readonly maxDepth: bigint;
  readonly maxLeaves: bigint;
  readonly target: bigint;

  constructor(
    maxDepth: bigint,
    maxLeaves: bigint,
    target: bigint,
  ) {
    this.maxDepth = maxDepth;
    this.maxLeaves = maxLeaves;
    this.target = target;
  }

  observeDecision(depth: bigint): void {
    while (
      this.openBranches.length > 0 &&
      this.openBranches[this.openBranches.length - 1].depth >= depth
    ) {
      const branch = this.openBranches.pop()!;
      this.closedChildren += branch.children;
      this.closedBranches++;
    }
    if (depth > 0n && this.openBranches.length > 0) {
      this.openBranches[this.openBranches.length - 1].children++;
    }
  }

  closeBranches(): void {
    while (this.openBranches.length > 0) {
      const branch = this.openBranches.pop()!;
      this.closedChildren += branch.children;
      this.closedBranches++;
    }
  }
}

class RecursiveSubtreeGenerator<T> implements Generator<T> {
  readonly owner: RecursiveGenerator<T>;
  readonly state: RecursiveState;
  readonly depth: bigint;

  constructor(
    owner: RecursiveGenerator<T>,
    state: RecursiveState,
    depth: bigint,
  ) {
    this.owner = owner;
    this.state = state;
    this.depth = depth;
  }

  doDraw(testCase: TestCase): T {
    testCase.startSpan("recursive");
    this.state.observeDecision(this.depth);
    const probability = Core.recursiveDecisionProbability(
      this.state.maxDepth,
      this.depth,
      this.state.target,
      this.state.attempt,
      this.state.closedChildren,
      this.state.closedBranches,
    );
    const branch = this.depth >= this.state.maxDepth
      ? testCase.forcedBoolean(false)
      : testCase.weighted(probability);
    let value: T;
    if (branch) {
      this.state.openBranches.push({ depth: this.depth, children: 0n });
      value = this.owner.branch(
        new RecursiveSubtreeGenerator(this.owner, this.state, this.depth + 1n),
      ).doDraw(testCase);
    } else {
      if (this.state.leaves >= this.state.maxLeaves) throw new RecursiveLeafBudget();
      this.state.leaves++;
      value = this.owner.leaf.doDraw(testCase);
    }
    if (this.depth !== 0n) testCase.stopSpan();
    return value;
  }
}

/** A generator for bounded recursively-defined values. */
export class RecursiveGenerator<T> implements Generator<T> {
  readonly leaf: Generator<T>;
  readonly branch: (subtrees: Generator<T>) => Generator<T>;
  readonly maxDepthLimit: bigint;
  readonly maxLeavesLimit: bigint;

  constructor(
    leaf: Generator<T>,
    branch: (subtrees: Generator<T>) => Generator<T>,
    maxDepthLimit = 32n,
    maxLeavesLimit = 100n,
  ) {
    this.leaf = leaf;
    this.branch = branch;
    this.maxDepthLimit = maxDepthLimit;
    this.maxLeavesLimit = maxLeavesLimit;
  }

  maxDepth(value: IntLike): RecursiveGenerator<T> {
    const limit = big(value);
    if (limit < 0n) throw new RangeError("maxDepth must be non-negative");
    return new RecursiveGenerator(this.leaf, this.branch, limit, this.maxLeavesLimit);
  }

  maxLeaves(value: IntLike): RecursiveGenerator<T> {
    const limit = big(value);
    if (limit < 0n || limit > (1n << 63n) - 1n) {
      throw new RangeError("maxLeaves must be in [0, 2^63 - 1]");
    }
    return new RecursiveGenerator(this.leaf, this.branch, this.maxDepthLimit, limit);
  }

  doDraw(testCase: TestCase): T {
    const baseDepth = testCase.openSpanDepth();
    let target = 1n;
    if (
      Core.recursiveTargetDrawn(this.maxLeavesLimit) &&
      testCase.weighted(Core.recursiveLargeTargetProbability())
    ) {
      target = testCase.integer(2n, this.maxLeavesLimit, 0n, null, true);
    }
    const state = new RecursiveState(this.maxDepthLimit, this.maxLeavesLimit, target);
    state.startPrice = Core.recursivePricedProbability(0n, 0n, 0n, target);
    while (true) {
      let value: T;
      try {
        value = new RecursiveSubtreeGenerator(this, state, 0n).doDraw(testCase);
      } catch (error) {
        if (!(error instanceof RecursiveLeafBudget)) throw error;
        testCase.resetOpenSpansTo(baseDepth);
        state.openBranches.length = 0;
        state.leaves = 0n;
        state.attempt++;
        if (!Core.recursiveRetryAllowed(state.attempt)) {
          testCase.assume(false);
          throw new Error("unreachable: assume(false) rejects the example");
        }
        state.startPrice = Core.recursivePricedProbability(
          state.closedChildren, state.closedBranches, state.attempt, state.target,
        );
        continue;
      }
      state.closeBranches();
      if (!Core.recursiveFinishMispriced(
        state.maxDepth,
        state.target,
        state.attempt,
        state.leaves,
        state.closedChildren,
        state.closedBranches,
        state.startPrice,
        state.reprices,
      )) {
        testCase.stopSpan();
        return value;
      }
      testCase.resetOpenSpansTo(baseDepth);
      state.leaves = 0n;
      state.reprices++;
      state.startPrice = Core.recursivePricedProbability(
        state.closedChildren, state.closedBranches, state.attempt, state.target,
      );
    }
  }
}

/** Generate recursively-defined values such as trees or JSON documents. */
export function recursive<T>(
  leaf: Generator<T>,
  branch: (subtrees: Generator<T>) => Generator<T>,
): RecursiveGenerator<T> {
  return new RecursiveGenerator(leaf, branch);
}

export type RecordValues<Fields extends Readonly<Record<string, Generator<unknown>>>> = {
  -readonly [Key in keyof Fields]: Fields[Key] extends Generator<infer Value> ? Value : never;
};

/** Draw the fields of a plain object in JavaScript property enumeration order. */
export function record<const Fields extends Readonly<Record<string, Generator<unknown>>>>(
  fields: Fields,
): Generator<RecordValues<Fields>> {
  return composite((draw) => {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(fields)) result[key] = draw(fields[key]);
    return result as RecordValues<Fields>;
  });
}
