// Code generated from conformance/{draw_ops,shell_cases}.zir by emitter/emit.go; DO NOT EDIT.

import assert from "node:assert/strict";
import { check, FailedCoverage, FailedHealthCheck, Failure, Flaky, Generators, InvalidReplay, keyHash, ReplayOverrun, TestCase, TooManyRejections } from "./index.ts";
import { asciiBytes, Rng } from "./shell.ts";
import * as Core from "./zizek_gen.ts";

export interface DeclaredShellCaseResult {
  emitted: string | undefined;
  handled: boolean;
}

export function runDeclaredShellCase(kind: string, fields: string[]): DeclaredShellCaseResult {
  switch (kind) {
    case "PROBE_EXTEND": {
      assert.equal(fields.length, 6, "PROBE_EXTEND field count");
      const blob = fields[0];
      const lo = BigInt(fields[1]);
      const hi = BigInt(fields[2]);
      const expected = fields[3];
      const total = BigInt(fields[4]);
      const probe_seed = BigInt(fields[5]);
      const recorded = expected === "-" ? [] : expected.split(",").map(BigInt);
      const stream = Core.rawFailureDecode(asciiBytes(blob));
      assert.ok(stream !== null, "unreadable reproduce blob");
      let overrun: unknown;
      try { const bare = new TestCase({ replay: stream }); for (let i = 0; i < Number(total); i++) bare.integer(lo, hi); } catch (error) { overrun = error; }
      assert.ok(overrun instanceof ReplayOverrun, "bare replay did not overrun");
      const probe = new TestCase({ rng: new Rng(probe_seed), replay: stream });
      const drawn: bigint[] = [];
      for (let i = 0; i < Number(total); i++) drawn.push(probe.integer(lo, hi));
      assert.deepEqual(drawn.slice(0, recorded.length), recorded);
      assert.equal(probe.draws.length, Number(total));
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_DESCENDANT": {
      assert.equal(fields.length, 4, "SHRINK_DESCENDANT field count");
      const hi = BigInt(fields[0]);
      const threshold = BigInt(fields[1]);
      const seed = BigInt(fields[2]);
      const examples = BigInt(fields[3]);
      function chain(testCase: TestCase): bigint[] {
        testCase.startSpan("node");
        const values = [testCase.integer(0n, hi)];
        if (testCase.boolean()) values.push(...chain(testCase));
        testCase.stopSpan(false);
        return values;
      }
      let failure: Failure | undefined;
      try {
        check((testCase) => { const values = chain(testCase); if (values[values.length - 1] >= threshold) throw new Error("the deepest node is too large"); }, { examples: Number(examples), maxRejections: Number(2000), seed: seed });
      } catch (error) { if (!(error instanceof Failure)) throw error; failure = error; }
      assert.ok(failure, "no failing chain was found");
      const seen: bigint[][] = [];
      let replayed = false;
      try { check((testCase) => { seen.push(chain(testCase)); throw new Error("replay"); }, { reproduce: failure.blob }); } catch (error) { if (!(error instanceof Failure)) throw error; replayed = true; }
      assert.ok(replayed, "replaying the shrunk blob did not fail");
      assert.deepEqual(seen, [[threshold]]);
      return { emitted: failure.blob, handled: true };
    }
    case "SHRINK_TRIVIAL": {
      assert.equal(fields.length, 3, "SHRINK_TRIVIAL field count");
      const hi = BigInt(fields[0]);
      const seed = BigInt(fields[1]);
      const examples = BigInt(fields[2]);
      const draw = (testCase: TestCase): [bigint, bigint, boolean, bigint] => {
        const guard = testCase.integer(0n, hi);
        testCase.startSpan("pair");
        const first = testCase.integer(0n, hi);
        const flag = testCase.boolean();
        const second = testCase.integer(0n, hi);
        testCase.stopSpan(false);
        return [guard, first, flag, second];
      };
      let failure: Failure | undefined;
      try {
        check((testCase) => { const [guard, first, , second] = draw(testCase); if (guard >= 1n && (first === 0n) === (second === 0n)) throw new Error("guarded pair"); }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) { if (!(error instanceof Failure)) throw error; failure = error; }
      assert.ok(failure, "no failing example found");
      const seen: Array<[bigint, bigint, boolean, bigint]> = [];
      let replayed = false;
      try { check((testCase) => { seen.push(draw(testCase)); throw new Error("replay"); }, { reproduce: failure.blob }); } catch (error) { if (!(error instanceof Failure)) throw error; replayed = true; }
      assert.ok(replayed, "replaying the trivial span did not fail");
      assert.deepEqual(seen, [[1n, 0n, false, 0n]]);
      return { emitted: failure.blob, handled: true };
    }
    case "KEY_SEQUENCE": {
      assert.equal(fields.length, 5, "KEY_SEQUENCE field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const seed = BigInt(fields[2]);
      const examples = BigInt(fields[3]);
      const expected_misses = BigInt(fields[4]);
      const sim = (insert: boolean, countdown: number[]) => (testCase: TestCase) => {
        const reads: bigint[] = [];
        const coins: bigint[] = [];
        for (let step = 0; step < 6; step++) {
          if (step % 2 === 0) {
            reads.push(testCase.integer(lo, hi, 0, testCase.nextKey("read")));
            if (insert && step === 0) reads.push(testCase.integer(lo, hi, 0, testCase.nextKey("read")));
          } else {
            coins.push(testCase.integer(0n, 1n, 0, testCase.nextKey("coin")));
          }
        }
        testCase.note(`${reads}|${coins}`);
        countdown[0] += 1;
        if (countdown[0] >= 4) throw new Error("boom");
      };
      let failure: Failure | undefined;
      try {
        check(sim(false, [0]), { examples: Number(examples), maxRejections: Number(1000), maxShrinks: Number(1), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        failure = error;
      }
      if (!failure) return { emitted: undefined, handled: true };
      const [reads, coins] = failure.notes[0].split("|");
      let replayed: Failure | undefined;
      try { check(sim(true, [99]), { reproduce: failure.blob }); } catch (error) { if (!(error instanceof Failure)) throw error; replayed = error; }
      assert.ok(replayed, "replaying the keyed sequence did not fail");
      const [gotReads, gotCoins] = replayed.notes[0].split("|");
      assert.equal(gotReads, `${reads},${lo}`);
      assert.equal(gotCoins, coins);
      assert.equal(replayed.puns, 0);
      assert.equal(BigInt(replayed.keyMisses), expected_misses);
      return { emitted: undefined, handled: true };
    }
    case "KEYED_REPLAY": {
      assert.equal(fields.length, 7, "KEYED_REPLAY field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const threshold = BigInt(fields[2]);
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      const expected = BigInt(fields[5]);
      const expected_misses = BigInt(fields[6]);
      const firstKey = keyHash("read", 1);
      const secondKey = keyHash("read", 2);
      const freshKey = keyHash("retry", 1);
      let failure: Failure | undefined;
      try {
        check((testCase) => {
          const first = testCase.integer(lo, hi, 0, firstKey);
          const second = testCase.integer(lo, hi, 0, secondKey);
          if (first >= threshold && second >= threshold) throw new Error("both large");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        failure = error;
      }
      assert.ok(failure, "the keyed property did not fail");
      const seen: bigint[][] = [];
      let replayed: Failure | undefined;
      try {
        check((testCase) => {
          const second = testCase.integer(lo, hi, 0, secondKey);
          testCase.integer(lo, hi, 0, freshKey);
          const first = testCase.integer(lo, hi, 0, firstKey);
          seen.push([first, second]);
          throw new Error("replay");
        }, { reproduce: failure.blob });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        replayed = error;
      }
      assert.ok(replayed, "replaying the keyed blob did not fail");
      assert.deepEqual(seen, [[expected, expected]], "keyed draws resolve by name");
      assert.equal(BigInt(replayed.keyMisses), expected_misses);
      return { emitted: failure.blob, handled: true };
    }
    case "KEYED_DEEP_CLONE": {
      assert.equal(fields.length, 4, "KEYED_DEEP_CLONE field count");
      const depth = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const seed = BigInt(fields[2]);
      const examples = BigInt(fields[3]);
      const deepKey = keyHash("deep");
      function innermost(testCase: TestCase, levels: bigint): bigint {
        for (let level = 0n; level < levels; level++) testCase = testCase.cloneStream();
        return testCase.integer(0n, hi, 0, deepKey);
      }
      let failure: Failure | undefined;
      try {
        check((testCase) => { if (innermost(testCase, depth) >= hi) throw new Error("the deepest keyed draw is too large"); }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) { if (!(error instanceof Failure)) throw error; failure = error; }
      assert.ok(failure, "the deep keyed property did not fail");
      assert.ok(Core.rawFailureDecode(asciiBytes(failure.blob)) !== null, "unreadable reproduce blob");
      const seen: bigint[] = [];
      let replayed = false;
      try { check((testCase) => { seen.push(innermost(testCase, depth)); throw new Error("replay"); }, { reproduce: failure.blob }); } catch (error) { if (!(error instanceof Failure)) throw error; replayed = true; }
      assert.ok(replayed, "replaying the deep keyed blob did not fail");
      assert.deepEqual(seen, [hi]);
      return { emitted: failure.blob, handled: true };
    }
    case "KEY_DIGEST": {
      assert.equal(fields.length, 2, "KEY_DIGEST field count");
      const name = fields[0];
      const expected = fields[1];
      assert.equal(keyHash(name).toString(16).padStart(16, "0"), expected);
      return { emitted: undefined, handled: true };
    }
    case "COST_FIRST": {
      assert.equal(fields.length, 6, "COST_FIRST field count");
      const sites = BigInt(fields[0]);
      const bound = BigInt(fields[1]);
      const threshold = BigInt(fields[2]);
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      const expected_faults = BigInt(fields[5]);
      try {
        check((testCase: TestCase) => {
          let fired = 0n;
          let total = 0n;
          for (let site = 0n; site < sites; site++) {
            if (testCase.boolean(testCase.nextKey("inject", site))) { fired += 1n; testCase.cost("fault"); continue; }
            total += testCase.integer(0n, bound, 0, testCase.nextKey("payload", site));
          }
          testCase.note(String(fired));
          if (fired > 0n && total >= threshold) throw new Error("boom");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        assert.equal(error.notes[0], String(expected_faults));
        assert.equal(BigInt(error.costs.get("fault") ?? 0), expected_faults);
        return { emitted: undefined, handled: true };
      }
      assert.fail("the cost property did not fail");
    }
    case "TWO_BUG": {
      assert.equal(fields.length, 6, "TWO_BUG field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const a_threshold = BigInt(fields[2]);
      const b_value = BigInt(fields[3]);
      const seed = BigInt(fields[4]);
      const examples = BigInt(fields[5]);
      const declaredBugA = new Error("bug A");
      const declaredBugB = new Error("bug B");
      let found: "A" | "B" | null = null;
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(lo, hi);
          if (draw0 > a_threshold) { found ??= "A"; throw declaredBugA; }
          if (draw0 === b_value) { found ??= "B"; throw declaredBugB; }
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const reported = error.propertyCause === declaredBugA ? "A" : "B";
        assert.equal(found, reported, `found bug ${found} but reported ${reported}`);
      }
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_MIN": {
      assert.equal(fields.length, 6, "SHRINK_MIN field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const threshold = BigInt(fields[2]);
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      const expected = BigInt(fields[5]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(lo, hi);
          if (draw0 >= threshold) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: bigint[] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.integer(lo, hi));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [expected], `draw 0 did not shrink to the declared value`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_SPARSE": {
      assert.equal(fields.length, 5, "SHRINK_SPARSE field count");
      const hi = BigInt(fields[0]);
      const period = BigInt(fields[1]);
      const dense = BigInt(fields[2]);
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(0n, hi);
          if (draw0 >= period && (draw0 % period === 0n || draw0 >= dense)) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: bigint[] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.integer(0n, hi));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [period], `draw 0 did not shrink to the declared value`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_DECLARED_LEN": {
      assert.equal(fields.length, 4, "SHRINK_DECLARED_LEN field count");
      const hi = BigInt(fields[0]);
      const threshold = BigInt(fields[1]);
      const seed = BigInt(fields[2]);
      const examples = BigInt(fields[3]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.collect(Generators.bigIntegers({ min: 0n, max: hi }), Number(0), Number(10), "list.element");
          const draw1 = testCase.integer(0n, 10n);
          if (draw1 === BigInt(draw0.length) && draw0.some((value) => value >= threshold)) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: bigint[][] = [];
        const seen1: bigint[] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.collect(Generators.bigIntegers({ min: 0n, max: hi }), Number(0), Number(10), "list.element"));
            seen1.push(testCase.integer(0n, 10n));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [[threshold]], `draw 0 did not shrink to the declared value`);
        assert.deepEqual(seen1, [1n], `draw 1 did not shrink to the declared value`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_GATE": {
      assert.equal(fields.length, 4, "SHRINK_GATE field count");
      const hi = BigInt(fields[0]);
      const threshold = BigInt(fields[1]);
      const seed = BigInt(fields[2]);
      const examples = BigInt(fields[3]);
      const draw = (testCase: TestCase): bigint[] => {
        const coin = testCase.integer(0n, hi);
        const drawn = [coin];
        if (coin < threshold) drawn.push(testCase.integer(0n, 2n));
        drawn.push(testCase.integer(-1000n, 1000n));
        return drawn;
      };
      let failure: Failure | undefined;
      try {
        check((testCase) => { draw(testCase); throw new Error("the gate always fails"); }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) { if (!(error instanceof Failure)) throw error; failure = error; }
      assert.ok(failure, "no failing example found");
      const seen: bigint[][] = [];
      let replayed = false;
      try { check((testCase) => { seen.push(draw(testCase)); throw new Error("replay"); }, { reproduce: failure.blob }); } catch (error) { if (!(error instanceof Failure)) throw error; replayed = true; }
      assert.ok(replayed, "replaying the raised gate did not fail");
      assert.deepEqual(seen, [[threshold, 0n]]);
      return { emitted: failure.blob, handled: true };
    }
    case "SHRINK_LIST": {
      assert.equal(fields.length, 6, "SHRINK_LIST field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const threshold = BigInt(fields[2]);
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      const expected = BigInt(fields[5]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.collect(Generators.bigIntegers({ min: lo, max: hi }), Number(0), null, "list.element");
          if (draw0.some((value) => value >= threshold)) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: bigint[][] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.collect(Generators.bigIntegers({ min: lo, max: hi }), Number(0), null, "list.element"));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [[expected]], `draw 0 did not shrink to the declared value`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_SET": {
      assert.equal(fields.length, 6, "SHRINK_SET field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const threshold = BigInt(fields[2]);
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      const expected = BigInt(fields[5]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.collectUnique(Generators.bigIntegers({ min: lo, max: hi }), null, Number(0), null, "set.element");
          if (draw0.some((value) => value >= threshold)) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: bigint[][] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.collectUnique(Generators.bigIntegers({ min: lo, max: hi }), null, Number(0), null, "set.element"));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [[expected]], `draw 0 did not shrink to the declared value`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_CLONE": {
      assert.equal(fields.length, 4, "SHRINK_CLONE field count");
      const hi = BigInt(fields[0]);
      const threshold = BigInt(fields[1]);
      const seed = BigInt(fields[2]);
      const examples = BigInt(fields[3]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(0n, hi);
          const draw1 = testCase.cloneStream().integer(0, hi);
          const draw2 = testCase.integer(0n, hi);
          if (draw1 >= threshold) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: bigint[] = [];
        const seen1: bigint[] = [];
        const seen2: bigint[] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.integer(0n, hi));
            seen1.push(testCase.cloneStream().integer(0, hi));
            seen2.push(testCase.integer(0n, hi));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [0n], `draw 0 did not shrink to the declared value`);
        assert.deepEqual(seen1, [threshold], `draw 1 did not shrink to the declared value`);
        assert.deepEqual(seen2, [0n], `draw 2 did not shrink to the declared value`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_DUPLICATE": {
      assert.equal(fields.length, 5, "SHRINK_DUPLICATE field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const seed = BigInt(fields[2]);
      const examples = BigInt(fields[3]);
      const expected = BigInt(fields[4]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(lo, hi);
          const draw1 = testCase.integer(lo, hi);
          if (draw0 === draw1 && draw0 !== 0n) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: bigint[] = [];
        const seen1: bigint[] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.integer(lo, hi));
            seen1.push(testCase.integer(lo, hi));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [expected], `draw 0 did not shrink to the declared value`);
        assert.deepEqual(seen1, [expected], `draw 1 did not shrink to the declared value`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_PAIR": {
      assert.equal(fields.length, 7, "SHRINK_PAIR field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const gap = BigInt(fields[2]);
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      const expected_first = BigInt(fields[5]);
      const expected_second = BigInt(fields[6]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(lo, hi);
          const draw1 = testCase.integer(lo, hi);
          if (draw0 - draw1 === gap) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: bigint[] = [];
        const seen1: bigint[] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.integer(lo, hi));
            seen1.push(testCase.integer(lo, hi));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [expected_first], `draw 0 did not shrink to the declared value`);
        assert.deepEqual(seen1, [expected_second], `draw 1 did not shrink to the declared value`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "ALWAYS_SHRINK": {
      assert.equal(fields.length, 6, "ALWAYS_SHRINK field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const threshold = BigInt(fields[2]);
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      const expected = BigInt(fields[5]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(lo, hi);
          testCase.always("stays small", draw0 < threshold);
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: bigint[] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.integer(lo, hi));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [expected], `draw 0 did not shrink to the declared value`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_REORDER": {
      assert.equal(fields.length, 6, "SHRINK_REORDER field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const first = BigInt(fields[2]);
      const second = BigInt(fields[3]);
      const seed = BigInt(fields[4]);
      const examples = BigInt(fields[5]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.collect(Generators.bigIntegers({ min: lo, max: hi }), Number(0), null, "list.element");
          if (new Set(draw0).size === 2 && new Set(draw0).has(first) && new Set(draw0).has(second)) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: bigint[][] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.collect(Generators.bigIntegers({ min: lo, max: hi }), Number(0), null, "list.element"));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [[first, second]], `draw 0 did not shrink to the declared value`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_TEXT": {
      assert.equal(fields.length, 7, "SHRINK_TEXT field count");
      const alphabet = fields[0];
      const min_size = BigInt(fields[1]);
      const max_size = BigInt(fields[2]);
      const threshold = BigInt(fields[3]);
      const seed = BigInt(fields[4]);
      const examples = BigInt(fields[5]);
      const expected = fields[6];
      const generator0 = () => {
        const text = Generators.text({ minSize: min_size, maxSize: max_size });
        return alphabet === "-" ? text : text.alphabet(alphabet);
      };
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.draw(generator0());
          if (BigInt([...draw0].length) >= threshold) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: string[] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.draw(generator0()));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [expected], `draw 0 did not shrink to the declared text`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "SHRINK_CHARS": {
      assert.equal(fields.length, 5, "SHRINK_CHARS field count");
      const alphabet = fields[0];
      const simplest = fields[1];
      const expected = fields[2];
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      const generator0 = () => {
        const text = Generators.text({ minSize: 2, maxSize: 5 });
        return alphabet === "-" ? text : text.alphabet(alphabet);
      };
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.draw(generator0());
          if ([...new Set(draw0)].some((character) => [...draw0].filter((other) => other === character).length > 1 && character !== simplest)) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(2000), seed: seed });
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        const seen0: string[] = [];
        try {
          check((testCase: TestCase) => {
            seen0.push(testCase.draw(generator0()));
            throw new Error("replay");
          }, { reproduce: error.blob });
          assert.fail("replaying the shrunk blob did not fail");
        } catch (replayError) {
          if (!(replayError instanceof Failure)) throw replayError;
        }
        assert.deepEqual(seen0, [expected], `draw 0 did not shrink to the declared text`);
        return { emitted: error.blob, handled: true };
      }
      return { emitted: undefined, handled: true };
    }
    case "UNIQUE_EXHAUSTED": {
      assert.equal(fields.length, 5, "UNIQUE_EXHAUSTED field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const min_size = BigInt(fields[2]);
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.collectUnique(Generators.bigIntegers({ min: lo, max: hi }), null, Number(min_size), null, "set.element");
          if (draw0.every((value) => value >= lo)) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) {
        if (error instanceof TooManyRejections || error instanceof FailedHealthCheck) return { emitted: undefined, handled: true };
        if (error instanceof Failure) throw new Error(`declared rejecting case reported a counterexample: ${error}`);
        throw error;
      }
      assert.fail("declared rejecting case completed successfully");
    }
    case "REPRODUCE_FAILS": {
      assert.equal(fields.length, 4, "REPRODUCE_FAILS field count");
      const blob = fields[0];
      const lo = BigInt(fields[1]);
      const hi = BigInt(fields[2]);
      const expected = BigInt(fields[3]);
      const seen0: bigint[] = [];
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(lo, hi);
          seen0.push(draw0);
          if (draw0 <= hi) throw new Error("declared failure");
        }, { reproduce: blob });
        assert.fail("portable failure blob did not reproduce");
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        assert.deepEqual(seen0, [expected], `portable failure replayed ${seen0}`);
      }
      return { emitted: undefined, handled: true };
    }
    case "REPRODUCE_PASSES": {
      assert.equal(fields.length, 3, "REPRODUCE_PASSES field count");
      const blob = fields[0];
      const lo = BigInt(fields[1]);
      const hi = BigInt(fields[2]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(lo, hi);
          if (draw0 >= hi) throw new Error("declared failure");
        }, { reproduce: blob });
        assert.fail("reproducing a passing blob completed successfully");
      } catch (error) {
        if (!(error instanceof InvalidReplay)) throw error;
      }
      return { emitted: undefined, handled: true };
    }
    case "PUN_REPORT": {
      assert.equal(fields.length, 4, "PUN_REPORT field count");
      const blob = fields[0];
      const lo = BigInt(fields[1]);
      const hi = BigInt(fields[2]);
      const expected_puns = BigInt(fields[3]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(lo, hi);
          if (draw0 <= hi) throw new Error("declared failure");
        }, { reproduce: blob });
        assert.fail("portable failure blob did not reproduce");
      } catch (error) {
        if (!(error instanceof Failure)) throw error;
        assert.equal(error.puns, Number(expected_puns), `reported ${error.puns} puns`);
        assert.equal(error.message.includes("warning:"), expected_puns !== 0n, error.message);
      }
      return { emitted: undefined, handled: true };
    }
    case "SOMETIMES_MISSED": {
      assert.equal(fields.length, 5, "SOMETIMES_MISSED field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const threshold = BigInt(fields[2]);
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(lo, hi);
          testCase.sometimes("above threshold", draw0 > threshold);
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
        assert.fail("vacuous run passed");
      } catch (error) {
        if (!(error instanceof FailedCoverage)) throw error;
        assert.equal(error.label, "above threshold");
        assert.equal(error.observed, Number(0));
        assert.equal(error.valid, Number(examples));
      }
      return { emitted: undefined, handled: true };
    }
    case "REQUIRE_MISSED": {
      assert.equal(fields.length, 1, "REQUIRE_MISSED field count");
      const examples = BigInt(fields[0]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(0n, 0n);
          if (draw0 >= 1n) throw new Error("declared failure");
        }, { examples: Number(examples), maxRejections: Number(1000), seed: 1n, require: [{ label: "unreached" }] });
        assert.fail("vacuous run passed");
      } catch (error) {
        if (!(error instanceof FailedCoverage)) throw error;
        assert.equal(error.label, "unreached");
        assert.equal(error.observed, Number(0));
        assert.equal(error.valid, Number(examples));
      }
      return { emitted: undefined, handled: true };
    }
    case "COVER_RATE": {
      assert.equal(fields.length, 2, "COVER_RATE field count");
      const examples = BigInt(fields[0]);
      const percent = BigInt(fields[1]);
      let attempts = 0;
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.integer(0n, 0n);
          attempts++; const held = attempts === 1; testCase.cover("first example", held, { percent: Number(percent) }); testCase.cover("first example", held, { percent: Number(percent) });
        }, { examples: Number(examples), maxRejections: Number(1000), seed: 1n });
        assert.fail("vacuous run passed");
      } catch (error) {
        if (!(error instanceof FailedCoverage)) throw error;
        assert.equal(error.label, "first example");
        assert.equal(error.observed, Number(1));
        assert.equal(error.valid, Number(examples));
      }
      return { emitted: undefined, handled: true };
    }
    case "COVER_STEERS": {
      assert.equal(fields.length, 8, "COVER_STEERS field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const floor = BigInt(fields[2]);
      const copies = BigInt(fields[3]);
      const percent = BigInt(fields[4]);
      const seed = BigInt(fields[5]);
      const examples = BigInt(fields[6]);
      const min_observed = BigInt(fields[7]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.collect(Generators.bigIntegers({ min: lo, max: hi }), Number(0), null, "list.element");
          testCase.cover("repeat", draw0.some((value) => value >= floor && draw0.filter((other) => other === value).length >= Number(copies)), { percent: Number(percent) });
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
        assert.fail("covered run passed");
      } catch (error) {
        if (!(error instanceof FailedCoverage)) throw error;
        assert.equal(error.label, "repeat");
        assert.ok(error.observed >= Number(min_observed));
        assert.equal(error.valid, Number(examples));
      }
      return { emitted: undefined, handled: true };
    }
    case "RARE_STEERS": {
      assert.equal(fields.length, 7, "RARE_STEERS field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const floor = BigInt(fields[2]);
      const copies = BigInt(fields[3]);
      const percent = BigInt(fields[4]);
      const seed = BigInt(fields[5]);
      const examples = BigInt(fields[6]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.collect(Generators.bigIntegers({ min: lo, max: hi }), Number(0), null, "list.element");
          testCase.cover("repeat", draw0.some((value) => value >= floor && draw0.filter((other) => other === value).length >= Number(copies)), { percent: Number(percent) });
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
        return { emitted: undefined, handled: true };
      } catch (error) {
        throw error;
      }
    }
    case "FLAKY_FAILURE": {
      assert.equal(fields.length, 4, "FLAKY_FAILURE field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const seed = BigInt(fields[2]);
      const examples = BigInt(fields[3]);
      let executions = 0;
      let flaky: Flaky | undefined;
      try {
        check((testCase: TestCase) => { testCase.integer(lo, hi); executions += 1; if (executions === 1) throw new Error("failed on the first execution"); }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
      } catch (error) { if (!(error instanceof Flaky)) throw error; flaky = error; }
      assert.ok(flaky, "a property that failed once did not report Flaky");
      assert.equal((flaky.propertyCause as Error).message, "failed on the first execution");
      assert.match(flaky.message, /flaky/);
      assert.match(flaky.message, /failed on the first execution/);
      return { emitted: flaky.blob, handled: true };
    }
    case "STEER_KEEPS_RANDOM": {
      assert.equal(fields.length, 6, "STEER_KEEPS_RANDOM field count");
      const lo = BigInt(fields[0]);
      const hi = BigInt(fields[1]);
      const percent = BigInt(fields[2]);
      const seed = BigInt(fields[3]);
      const examples = BigInt(fields[4]);
      const min_observed = BigInt(fields[5]);
      try {
        check((testCase: TestCase) => {
          const draw0 = testCase.collect(Generators.bigIntegers({ min: lo, max: hi }), Number(0), null, "list.element");
          if (draw0.length > 0) testCase.cover(`bucket ${draw0[0] % 10n}`, true);
          testCase.cover("empty", draw0.length === 0, { percent: Number(percent) });
        }, { examples: Number(examples), maxRejections: Number(1000), seed: seed });
        assert.fail("covered run passed");
      } catch (error) {
        if (!(error instanceof FailedCoverage)) throw error;
        assert.equal(error.label, "empty");
        assert.ok(error.observed >= Number(min_observed));
        assert.equal(error.valid, Number(examples));
      }
      return { emitted: undefined, handled: true };
    }
    default:
      return { emitted: undefined, handled: false };
  }
}
