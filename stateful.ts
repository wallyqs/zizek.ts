// Model-based stateful testing.
//
// The per-step continue decision and the pool's stable variable identifiers
// come from ir/stateful.zir, so a state-machine run explores the same shape in
// every language.

import * as Core from "./zizek_gen.ts";
import { AssumptionRejected, type Generator, type TestCase } from "./shell.ts";

export const DEFAULT_STEP_COUNT = 50n;

// Chance a free per-step "stop here?" boolean comes up true under the stop
// protocols (1 and 2), which only a replay of an older blob still records, and
// which a probe extends from the RNG once that blob runs out. New cases record
// a "continue?" boolean instead, at Core.statefulContinueProbability().
const STOP_PROBABILITY = 1 / 65536;

export interface Rule<M> {
  name: string;
  apply(machine: M, testCase: TestCase): void;
}

export interface Invariant<M> {
  name: string;
  apply(machine: M, testCase: TestCase): void;
}

export interface Machine<M> {
  rules: readonly Rule<M>[];
  invariants: readonly Invariant<M>[];
}

/**
 * Execution-local pool of arbitrary host-language values.
 *
 * A variable's identity is a *recorded* choice rather than a host-side counter,
 * and a draw from the pool records the identifier it selected rather than a
 * position in the live list. That is what lets the shrinker delete an earlier
 * addition without changing what every later draw refers to — see
 * ir/stateful.zir's stable-identifier section. Before that, deleting one
 * addition renumbered every reference after it, so most deletions produced a
 * different rule sequence that no longer failed and shrinking stalled far from
 * minimal.
 */
export class Pool<T> {
  private readonly active: bigint[] = [];
  private readonly values = new Map<bigint, T>();

  get length(): number {
    return this.active.length;
  }

  get isEmpty(): boolean {
    return this.active.length === 0;
  }

  /**
   * Add a value under a freshly drawn identifier.
   *
   * Takes the case because adding is now a *draw*: the identifier is recorded
   * in the choice stream rather than handed out by a host-side counter, which
   * is what lets a later reference to this variable keep meaning this variable
   * when an earlier addition is shrunk away.
   */
  add(testCase: TestCase, value: T): void {
    const variableId = testCase.freshId();
    this.active.push(variableId);
    this.values.set(variableId, value);
  }

  /** Draws an existing value and leaves it in the pool. */
  valuesReusable(): Generator<T> {
    return {
      doDraw: (testCase: TestCase): T => {
        return this.values.get(this.select(testCase))!;
      },
    };
  }

  /** Draws an existing value and removes it from the pool. */
  valuesConsumed(): Generator<T> {
    return {
      doDraw: (testCase: TestCase): T => {
        const variableId = this.select(testCase);
        this.active.splice(this.active.indexOf(variableId), 1);
        const value = this.values.get(variableId)!;
        this.values.delete(variableId);
        return value;
      },
    };
  }

  /** The identifier this draw names, recorded by value rather than position. */
  private select(testCase: TestCase): bigint {
    testCase.assume(!this.isEmpty);
    return testCase.fromSet(this.active);
  }
}

export function pool<T>(_testCase: TestCase): Pool<T> {
  return new Pool<T>();
}

class FeatureFlags {
  private readonly probability: number;
  private readonly disabled: (boolean | null)[];
  private readonly candidates = new Set<number>();

  constructor(testCase: TestCase, ruleCount: number) {
    const raw = testCase.statefulFeatureProbabilityRaw(
      Core.statefulFeatureGenerationRaw(),
    );
    this.probability = Core.statefulFeatureProbability(raw);
    this.disabled = Array(ruleCount).fill(null);
    for (let index = 0; index < ruleCount; index++) this.candidates.add(index);
  }

  enabled(testCase: TestCase, index: number): boolean {
    testCase.startSpan("stateful.feature_flag");
    const decided = this.disabled[index];
    const forced = Core.statefulFeatureForced(
      BigInt(this.candidates.size),
      this.candidates.has(index),
      decided !== null,
      decided ?? false,
    );
    let disabled: boolean;
    try {
      disabled = forced === null
        ? testCase.weighted(this.probability)
        : testCase.forcedBoolean(forced);
    } catch (error) {
      testCase.stopSpan();
      throw error;
    }
    this.disabled[index] = disabled;
    if (!disabled) this.candidates.clear();
    this.candidates.delete(index);
    testCase.stopSpan();
    return !disabled;
  }
}

function drawRuleIndex(testCase: TestCase, ruleCount: number): number {
  return Number(testCase.integer(0, ruleCount - 1));
}

function selectRule(
  testCase: TestCase,
  ruleCount: number,
  previous: FeatureFlags | null,
): [number, FeatureFlags] {
  const flags = previous ?? new FeatureFlags(testCase, ruleCount);
  const knownBad = new Set<number>();
  for (let attempt = 0n; attempt < Core.statefulRuleProbeCount(); attempt++) {
    // A probe — the rule index and the flag it consults — is one span, so the
    // shrinker can delete a probe that landed on a disabled rule without
    // misaligning the draws after it. A misaligned continue decision reads as
    // a stop, so that deletion is the one that reaches the minimal sequence;
    // the span tree is not part of the blob.
    testCase.startSpan("stateful.rule_probe");
    let index: number;
    let enabled: boolean;
    try {
      index = drawRuleIndex(testCase, ruleCount);
      enabled = !knownBad.has(index) && flags.enabled(testCase, index);
    } finally {
      testCase.stopSpan();
    }
    if (enabled) return [index, flags];
    knownBad.add(index);
  }

  const maxGood = Core.statefulFallbackMaxGood(
    BigInt(ruleCount), BigInt(knownBad.size),
  );
  const speculative = testCase.integer(0n, maxGood - 1n);
  const allowed: number[] = [];
  for (let index = 0; index < ruleCount; index++) {
    if (knownBad.has(index) || !flags.enabled(testCase, index)) continue;
    allowed.push(index);
    if (Core.statefulFallbackAccept(BigInt(allowed.length), speculative)) {
      return [Number(testCase.forcedInteger(index)), flags];
    }
  }
  const offset = Number(testCase.integer(0, allowed.length - 1));
  return [Number(testCase.forcedInteger(allowed[offset])), flags];
}

/**
 * Execute registered rules for at most `stepCount` successful steps.
 *
 * The case runs at least one step and at most `stepCount` successful ones.
 * There is no step budget drawn up front: before each step the case draws one
 * "continue?" boolean, which `statefulContinueForced` either forces or leaves
 * to the choice stream. Its simplest value stops, so the simplest case runs
 * exactly one step and the shrinker can end a run at any step by lowering one
 * boolean. A rule that rejects via `assume` spends an attempt but not a step,
 * so a machine with selective assumptions still gets its full run.
 *
 * A replayed blob recorded before the decision was inverted draws a "stop
 * here?" boolean instead; `statefulChoiceProtocol` tells them apart.
 */
export function run<M extends Machine<M>>(
  machine: M,
  testCase: TestCase,
  stepCount: bigint = DEFAULT_STEP_COUNT,
): void {
  const rules = machine.rules;
  testCase.assume(rules.length > 0);
  const invariants = machine.invariants;
  testCase.note("initial invariant check");
  checkInvariants(machine, invariants, testCase);

  let stepsDrawn = 0n;
  let stepsRejected = 0n;
  const protocol = testCase.statefulProtocol();
  const stopHere = (): boolean => {
    if (protocol === 3n) {
      const forced = Core.statefulContinueForced(stepsDrawn, stepsRejected, stepCount);
      return !(forced === null
        ? testCase.weighted(Core.statefulContinueProbability())
        : testCase.forcedBoolean(forced));
    }
    const forced = Core.statefulStopForced(stepsDrawn, stepsRejected, stepCount);
    return forced === null
      ? testCase.weighted(STOP_PROBABILITY)
      : testCase.forcedBoolean(forced);
  };

  // The first decision, which is forced, and the feature probability sit
  // before any step's span; each step's span then holds its rule probes, the
  // rule's own draws, and the decision that follows it. That makes every step,
  // the first included, one span the shrinker can delete without misaligning
  // the steps after it. Upstream's span starts at the decision instead, which
  // leaves the first step undeletable here: deleting it takes the forced
  // decision and the probability with it, and a misread decision stops the
  // run. The span tree is not part of the blob.
  if (stopHere()) return;
  let featureFlags: FeatureFlags | null =
    protocol === 1n ? null : new FeatureFlags(testCase, rules.length);

  for (;;) {
    testCase.startSpan("stateful.rule");
    let rejected = false;
    let stop: boolean;
    try {
      let index: number;
      if (featureFlags === null) {
        index = drawRuleIndex(testCase, rules.length);
      } else {
        [index, featureFlags] = selectRule(testCase, rules.length, featureFlags);
      }
      const rule = rules[index];
      stepsDrawn += 1n;
      testCase.note(`step ${stepsDrawn}: ${rule.name}`);
      try {
        rule.apply(machine, testCase);
      } catch (error) {
        if (!(error instanceof AssumptionRejected)) throw error;
        stepsRejected += 1n;
        rejected = true;
        testCase.note("rule rejected by assumption");
      }
      if (!rejected) checkInvariants(machine, invariants, testCase);
      stop = stopHere();
    } catch (error) {
      testCase.stopSpan();
      throw error;
    }
    testCase.stopSpan(rejected);
    if (stop) return;
  }
}

function checkInvariants<M>(
  machine: M,
  invariants: readonly Invariant<M>[],
  testCase: TestCase,
): void {
  for (const invariant of invariants) {
    testCase.note(`invariant: ${invariant.name}`);
    invariant.apply(machine, testCase);
  }
}
