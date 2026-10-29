import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as Zizek from "./index.ts";

// The public API is what index.ts exports — the package's exports map exposes
// no other module — plus the TestCase members a property calls. Everything
// else in shell.ts is internal: unexported, `private`, or marked @internal,
// which keeps it out of the published declarations.

test("the entry point exports only the documented API", () => {
  assert.deepEqual(Object.keys(Zizek).sort(), [
    "AssumptionRejected",
    "DEFAULT_DATABASE_PATH",
    "DirectoryDatabase",
    "FailedCoverage",
    "FailedHealthCheck",
    "Failure",
    "Flaky",
    "Generators",
    "InMemoryDatabase",
    "InvalidReplay",
    "ReplayOverrun",
    "Stateful",
    "TestCase",
    "TooManyRejections",
    "alphabet",
    "alphabetRange",
    "check",
    "databaseDigest",
    "keyHash",
  ]);
  for (const internal of ["Core", "Rng", "shrink", "execute", "serializedDraws", "MAX_CLONE_DEPTH"]) {
    assert.ok(!(internal in Zizek), `${internal} must not be exported`);
  }
});

test("the generator namespace exports factories and their generator types", () => {
  const factories = Object.keys(Zizek.Generators).filter((name) => !name.endsWith("Generator"));
  assert.deepEqual(factories.sort(), [
    "arrays", "bigIntegers", "binary", "booleans", "characters", "composite", "filter",
    "flatMap", "floats", "integers", "just", "lists", "map", "maps", "none", "oneOf",
    "optional", "record", "recursive", "sampledFrom", "sets", "text", "tuples",
    "uniqueLists", "weightedBooleans",
  ]);
});

test("the stateful namespace exports the runner and pools", () => {
  assert.deepEqual(Object.keys(Zizek.Stateful).sort(), ["DEFAULT_STEP_COUNT", "Pool", "pool", "run"]);
});

// TypeScript visibility is a compile-time property, so the TestCase surface is
// read from the declarations themselves: every member of the class that is
// neither `private` nor tagged @internal is public.
function publicTestCaseMembers(): string[] {
  const source = readFileSync(`${import.meta.dirname}/shell.ts`, "utf8");
  const start = source.indexOf("export class TestCase {");
  const end = source.indexOf("\n}\n", start);
  assert.ok(start >= 0 && end > start, "TestCase declaration not found");
  const lines = source.slice(start, end).split("\n");
  const members: string[] = [];
  let doc = "";
  let inDoc = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (line.startsWith("  /**")) {
      doc = "";
      inDoc = true;
    }
    if (inDoc) {
      doc += `${trimmed}\n`;
      if (trimmed.endsWith("*/")) inDoc = false;
      continue;
    }
    const member = /^ {2}(?:readonly |static |get |set )*([A-Za-z_]\w*)\s*[(<:=?;]/.exec(line);
    if (member !== null && member[1] !== "private") {
      if (member[1] !== "constructor" && !doc.includes("@internal")) members.push(member[1]);
      doc = "";
    } else if (line.startsWith("  private ")) {
      doc = "";
    }
  }
  return [...new Set(members)].sort();
}

test("TestCase exposes only the calls a property makes", () => {
  assert.deepEqual(publicTestCaseMembers(), [
    "always", "assume", "boolean", "bytes", "cloneStream", "cost", "cover", "draw",
    "float", "integer", "nextKey", "note", "sometimes", "startSpan", "stopSpan",
    "string", "target", "unreachable", "weighted",
  ]);
});
