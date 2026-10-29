// Model-based stateful example: a bounded ring queue vs a plain array model.
//
// Demonstrates:
//   - manual state machines (Stateful.Rule, Stateful.run);
//   - assumptions inside rules (pop is rejected while the queue is empty);
//   - invariants checked after every successful rule;
//   - failure capture — the bug eventually reads past the backing array; and
//   - structural shrinking of whole rule spans plus blob replay.

import { check, Failure, Generators, Stateful, type TestCase } from "../index.ts";

const CAPACITY = 2;

// The shrunk failure blob is identical in Go, Python, Ruby, and TypeScript.
export const PORTABLE_QUEUE_FAILURE =
  "AXicjcnBCQBACAPB3e8VcP2XqiL4E8xnQvIB5UmlcYrbkp7ONAAiJQCa";

// A fixed-capacity FIFO queue over a circular buffer. Pop wraps the head index
// one slot too late — a deliberate off-by-one that reads past the backing array
// (returning undefined) on the third pop.
class RingQueue {
  private readonly data: (number | undefined)[] = new Array(CAPACITY).fill(0);
  private head = 0;
  private tail = 0;
  size = 0;

  push(value: number): boolean {
    if (this.size === CAPACITY) return false;
    this.data[this.tail] = value;
    this.tail = (this.tail + 1) % CAPACITY;
    this.size++;
    return true;
  }

  pop(): number | undefined {
    const value = this.data[this.head];
    this.head = (this.head + 1) % (CAPACITY + 1); // BUG: should wrap modulo CAPACITY
    this.size--;
    return value;
  }
}

export class QueueTest implements Stateful.Machine<QueueTest> {
  private readonly queue = new RingQueue();
  private readonly model: number[] = [];

  push(testCase: TestCase): void {
    const value = testCase.draw(Generators.integers({ min: 0, max: 99 }));
    if (this.queue.push(value)) {
      this.model.push(value);
      testCase.note(`push ${value}`);
    } else {
      testCase.note(`push ${value} refused: queue full`);
    }
  }

  pop(testCase: TestCase): void {
    testCase.assume(this.model.length > 0);
    const want = this.model.shift();
    const got = this.queue.pop();
    testCase.note(`pop -> ${got}`);
    if (got !== want) throw new Error(`pop returned ${got}, expected ${want}`);
  }

  sizesAgree(): void {
    if (this.queue.size === this.model.length) return;
    throw new Error(
      `queue reports ${this.queue.size} items, model holds ${this.model.length}`,
    );
  }

  readonly rules: readonly Stateful.Rule<QueueTest>[] = [
    { name: "push", apply: (machine, testCase) => machine.push(testCase) },
    { name: "pop", apply: (machine, testCase) => machine.pop(testCase) },
  ];

  readonly invariants: readonly Stateful.Invariant<QueueTest>[] = [
    { name: "sizes_agree", apply: (machine) => machine.sizesAgree() },
  ];
}

export function property(testCase: TestCase): void {
  Stateful.run(new QueueTest(), testCase);
}

export function findAndReplayBug(): Failure {
  let found: Failure;
  try {
    check(property, { examples: 2_000, seed: 2 });
    throw new Error("the ring-queue off-by-one should be discovered");
  } catch (error) {
    if (!(error instanceof Failure)) throw error;
    found = error;
  }

  try {
    check(property, { reproduce: found.blob });
  } catch (error) {
    if (error instanceof Failure) return found;
    throw error;
  }
  throw new Error("the shrunk queue failure must replay");
}

if (process.argv[1] === import.meta.filename) console.log(findAndReplayBug().message);
