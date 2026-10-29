// Minimal ambient declarations for the handful of host APIs the shell, the
// examples, and the conformance checker touch.
//
// The rest of the pipeline type-checks against nothing but the standard
// library, and pulling in @types/node would make type-checking depend on a
// network install. This file is the whole surface; it is not part of the
// published declarations, which reference none of it.

declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare const process: {
  argv: string[];
  pid: number;
  cwd(): string;
  chdir(path: string): void;
  exit(code?: number): never;
  hrtime: {
    bigint(): bigint;
  };
};

/** WHATWG encoding API; present in every runtime the package supports. */
declare class TextEncoder {
  encode(input?: string): Uint8Array;
}

interface ImportMeta {
  /** Absolute path of the current module — used to detect direct execution. */
  filename: string;
  /** Absolute path of the directory holding the current module. */
  dirname: string;
}

declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function readFileSync(path: string): Uint8Array;
  export function readdirSync(path: string): string[];
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function writeFileSync(path: string, data: Uint8Array): void;
  export function renameSync(oldPath: string, newPath: string): void;
  export function unlinkSync(path: string): void;
  export function rmdirSync(path: string): void;
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:test" {
  export interface TestContext {
    skip(message?: string): void;
  }
  export function test(name: string, fn: (t: TestContext) => void | Promise<void>): void;
}

declare module "node:assert/strict" {
  interface Assert {
    (value: unknown, message?: string): asserts value;
    ok(value: unknown, message?: string): asserts value;
    equal(actual: unknown, expected: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    match(value: string, pattern: RegExp, message?: string): void;
    throws(block: () => unknown, error?: RegExp, message?: string): void;
    fail(message?: string): never;
  }
  const assert: Assert;
  export default assert;
}
