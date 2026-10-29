// The persistent example database shared by every Zizek host.
//
// Values are raw serialized choice streams, not reproduce blobs. Directory
// names and entry names use the compiled keyed-draw hash, so this layout is
// byte-compatible with the other language packages.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import * as Core from "./zizek_gen.ts";

export const DEFAULT_DATABASE_PATH = ".zizek/examples";
const NAME_FILE = ".name";
const ENTRY = /^[0-9a-f]{16}$/;
const ENCODER = new TextEncoder();
let temporaryOrdinal = 0;

export interface Database {
  fetch(key: string): readonly Uint8Array[];
  save(key: string, value: Uint8Array): void;
  delete(key: string, value: Uint8Array): void;
}

export type DatabaseOption = Database | string | boolean | null;

export function databaseDigest(value: string | Uint8Array): string {
  const raw = typeof value === "string" ? ENCODER.encode(value) : value;
  return Core.keyHash(Core.keyAppendText(new Uint8Array(), raw))
    .toString(16)
    .padStart(16, "0");
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, at) => byte === right[at]);
}

export function shortlexCompare(left: Uint8Array, right: Uint8Array): number {
  if (left.length !== right.length) return left.length - right.length;
  for (let at = 0; at < left.length; at++) {
    if (left[at] !== right[at]) return left[at] - right[at];
  }
  return 0;
}

export class InMemoryDatabase implements Database {
  private readonly entries = new Map<string, Uint8Array[]>();

  fetch(key: string): readonly Uint8Array[] {
    return (this.entries.get(key) ?? []).map((entry) => entry.slice());
  }

  save(key: string, value: Uint8Array): void {
    const entries = this.entries.get(key) ?? [];
    if (entries.some((entry) => sameBytes(entry, value))) return;
    entries.push(value.slice());
    this.entries.set(key, entries);
  }

  delete(key: string, value: Uint8Array): void {
    const entries = this.entries.get(key);
    if (entries === undefined) return;
    const at = entries.findIndex((entry) => sameBytes(entry, value));
    if (at < 0) return;
    entries.splice(at, 1);
    if (entries.length === 0) this.entries.delete(key);
  }
}

export class DirectoryDatabase implements Database {
  readonly path: string;

  constructor(path = DEFAULT_DATABASE_PATH) {
    this.path = path || DEFAULT_DATABASE_PATH;
  }

  keyPath(key: string): string {
    return join(this.path, databaseDigest(key));
  }

  valuePath(key: string, value: Uint8Array): string {
    return join(this.keyPath(key), databaseDigest(value));
  }

  fetch(key: string): readonly Uint8Array[] {
    try {
      const directory = this.keyPath(key);
      const entries: Uint8Array[] = [];
      for (const name of readdirSync(directory)) {
        if (!ENTRY.test(name)) continue;
        try {
          entries.push(Uint8Array.from(readFileSync(join(directory, name))));
        } catch {
          // A concurrent run collected it after the directory listing.
        }
      }
      return entries;
    } catch {
      return [];
    }
  }

  save(key: string, value: Uint8Array): void {
    try {
      const directory = this.keyPath(key);
      mkdirSync(directory, { recursive: true });
      const namePath = join(directory, NAME_FILE);
      if (!existsSync(namePath)) atomicWrite(namePath, ENCODER.encode(key));
      const entryPath = this.valuePath(key, value);
      if (!existsSync(entryPath)) atomicWrite(entryPath, value);
    } catch {
      // The database is a best-effort cache and never changes a verdict.
    }
  }

  delete(key: string, value: Uint8Array): void {
    try {
      unlinkSync(this.valuePath(key, value));
    } catch {
      return;
    }
    try {
      const directory = this.keyPath(key);
      if (readdirSync(directory).some((name) => ENTRY.test(name))) return;
      unlinkSync(join(directory, NAME_FILE));
      rmdirSync(directory);
    } catch {
      // A concurrent writer or remover won the race; either state is valid.
    }
  }
}

function atomicWrite(path: string, payload: Uint8Array): void {
  const temporary = `${path}.tmp-${process.pid}-${temporaryOrdinal++}`;
  try {
    writeFileSync(temporary, payload);
    renameSync(temporary, path);
  } catch {
    try {
      writeFileSync(path, payload);
    } catch {
      // Best effort.
    }
    try {
      unlinkSync(temporary);
    } catch {
      // Nothing to collect.
    }
  }
}

export function resolveDatabase(spec: DatabaseOption | undefined): Database | null {
  if (spec === undefined || spec === null || spec === false) return null;
  if (spec === true) return new DirectoryDatabase();
  if (spec === ":memory:") return new InMemoryDatabase();
  if (typeof spec === "string") return new DirectoryDatabase(spec);
  for (const method of ["fetch", "save", "delete"] as const) {
    if (typeof spec[method] !== "function") {
      throw new TypeError(`database object has no ${method} method`);
    }
  }
  return spec;
}
