// Model-based stateful example: a double-entry ledger whose transfer rule has
// an off-by-one overdraft check, so a balance can go negative.

import { check, Failure, Generators, Stateful, type TestCase } from "../index.ts";

const LIMIT = 1_000_000;

// The shrunk failure blob is identical in Go, Python, Ruby, and TypeScript.
export const PORTABLE_LEDGER_FAILURE =
  "AXicVYyxCQAgEAMvYmXtILr/cipq+C/ChRykA4K2w4eohyMuWU0ryUWvXBSLdK4FQmgBCA==";

class Ledger {
  readonly balances = new Map<string, number>();

  credit(account: string, amount: number): void {
    this.balances.set(account, (this.balances.get(account) ?? 0) + amount);
  }

  debit(account: string, amount: number): void {
    this.balances.set(account, (this.balances.get(account) ?? 0) - amount);
  }

  transfer(source: string, destination: string, amount: number): void {
    const sourceBalance = this.balances.get(source) ?? 0;
    // BUG: the overdraft guard is off by one, so a transfer may leave the
    // source one unit below zero.
    if (source === destination || amount - sourceBalance > 1) return;
    this.debit(source, amount);
    this.credit(destination, amount);
  }
}

export class LedgerTest implements Stateful.Machine<LedgerTest> {
  private readonly ledger = new Ledger();
  private readonly accounts: Stateful.Pool<string>;

  constructor(accounts: Stateful.Pool<string>) {
    this.accounts = accounts;
  }

  createAccount(testCase: TestCase): void {
    const account = testCase.draw(Generators.text({ minSize: 1 }));
    testCase.note(`create account ${JSON.stringify(account)}`);
    this.accounts.add(testCase, account);
  }

  credit(testCase: TestCase): void {
    const account = testCase.draw(this.accounts.valuesReusable());
    const amount = testCase.draw(Generators.integers({ min: 0, max: LIMIT }));
    testCase.note(`credit ${JSON.stringify(account)} with ${amount}`);
    this.ledger.credit(account, amount);
  }

  transfer(testCase: TestCase): void {
    const source = testCase.draw(this.accounts.valuesReusable());
    const destination = testCase.draw(this.accounts.valuesReusable());
    const amount = testCase.draw(Generators.integers({ min: 0, max: LIMIT }));
    testCase.note(
      `transfer ${amount} from ${JSON.stringify(source)} to ${JSON.stringify(destination)}`,
    );
    this.ledger.transfer(source, destination, amount);
  }

  nonnegativeBalances(): void {
    for (const [account, balance] of this.ledger.balances) {
      if (balance < 0) {
        throw new Error(
          `account ${JSON.stringify(account)} has negative balance ${balance}`,
        );
      }
    }
  }

  readonly rules: readonly Stateful.Rule<LedgerTest>[] = [
    { name: "create_account", apply: (machine, testCase) => machine.createAccount(testCase) },
    { name: "credit", apply: (machine, testCase) => machine.credit(testCase) },
    { name: "transfer", apply: (machine, testCase) => machine.transfer(testCase) },
  ];

  readonly invariants: readonly Stateful.Invariant<LedgerTest>[] = [
    { name: "nonnegative_balances", apply: (machine) => machine.nonnegativeBalances() },
  ];
}

export function property(testCase: TestCase): void {
  Stateful.run(new LedgerTest(Stateful.pool<string>(testCase)), testCase);
}

export function findAndReplayBug(): Failure {
  let found: Failure;
  try {
    check(property, { examples: 2_000, seed: 2 });
    throw new Error("the ledger off-by-one bug should be discovered");
  } catch (error) {
    if (!(error instanceof Failure)) throw error;
    if (!error.message.includes("negative balance")) throw error;
    found = error;
  }

  try {
    check(property, { reproduce: found.blob });
  } catch (error) {
    if (error instanceof Failure) return found;
    throw error;
  }
  throw new Error("the shrunk ledger failure must replay");
}

if (process.argv[1] === import.meta.filename) console.log(findAndReplayBug().message);
