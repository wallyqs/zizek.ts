// Generated from conformance/shell/draw_ops.zir by the zizek emitter. Do not edit by hand.

import { alphabet, Generators, type TestCase } from "./index.ts";

const floatBits = new DataView(new ArrayBuffer(8));

function f64FromBits(text: string): number {
  floatBits.setBigUint64(0, BigInt(`0x${text}`));
  return floatBits.getFloat64(0);
}

function f64ToBits(value: number): bigint {
  floatBits.setFloat64(0, value);
  return floatBits.getBigUint64(0);
}

function utf8FromHex(text: string): string {
  const bytes: number[] = [];
  for (let at = 0; at < text.length; at += 2) bytes.push(Number.parseInt(text.slice(at, at + 2), 16));
  let out = "";
  for (let at = 0; at < bytes.length;) {
    const first = bytes[at++];
    let codepoint: number;
    if (first < 0x80) codepoint = first;
    else if (first < 0xe0) codepoint = ((first & 0x1f) << 6) | (bytes[at++] & 0x3f);
    else if (first < 0xf0) codepoint = ((first & 0x0f) << 12) | ((bytes[at++] & 0x3f) << 6) | (bytes[at++] & 0x3f);
    else codepoint = ((first & 0x07) << 18) | ((bytes[at++] & 0x3f) << 12) | ((bytes[at++] & 0x3f) << 6) | (bytes[at++] & 0x3f);
    out += String.fromCodePoint(codepoint);
  }
  return out;
}

function alphabetFromHex(text: string): Uint8Array | null {
  return text === "" ? null : alphabet(utf8FromHex(text));
}

function utf8ToHex(value: string): string {
  const bytes: number[] = [];
  for (const character of value) {
    const codepoint = character.codePointAt(0)!;
    if (codepoint < 0x80) bytes.push(codepoint);
    else if (codepoint < 0x800) bytes.push(0xc0 | (codepoint >> 6), 0x80 | (codepoint & 0x3f));
    else if (codepoint < 0x10000) bytes.push(0xe0 | (codepoint >> 12), 0x80 | ((codepoint >> 6) & 0x3f), 0x80 | (codepoint & 0x3f));
    else bytes.push(0xf0 | (codepoint >> 18), 0x80 | ((codepoint >> 12) & 0x3f), 0x80 | ((codepoint >> 6) & 0x3f), 0x80 | (codepoint & 0x3f));
  }
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function traceDraw(testCase: TestCase, op: string): string {
  const [head, ...fields] = op.split(":");
  switch (head) {
    case "i": {
      const value = testCase.integer(BigInt(fields[0]), BigInt(fields[1]));
      return `i:${value}`;
    }
    case "b": {
      const value = testCase.boolean();
      return `b:${value ? 1 : 0}`;
    }
    case "y": {
      const value = testCase.bytes(Number(fields[0]), Number(fields[1]));
      const encoded = Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
      return `y:${encoded}`;
    }
    case "f": {
      const value = testCase.float(f64FromBits(fields[0]), f64FromBits(fields[1]), { smallestNonzeroMagnitude: Number.MIN_VALUE });
      return `f:${f64ToBits(value).toString(16).padStart(16, "0")}`;
    }
    case "s": {
      const value = testCase.string(Number(fields[0]), Number(fields[1]), alphabetFromHex(fields[2]));
      return `s:${utf8ToHex(value)}`;
    }
    case "k": {
      const value = testCase.integer(BigInt(fields[0]), BigInt(fields[1]), 0, BigInt(`0x${fields[2]}`));
      return `k:${value}`;
    }
    case "l": {
      const value = testCase.collect(Generators.bigIntegers({ min: BigInt(fields[2]), max: BigInt(fields[3]) }), Number(fields[0]), fields[1] === "-" ? null : Number(fields[1]), "list.element");
      return `l:${value.join(",")}`;
    }
    case "q": {
      const value = testCase.collectUnique(Generators.bigIntegers({ min: BigInt(fields[2]), max: BigInt(fields[3]) }), null, Number(fields[0]), fields[1] === "-" ? null : Number(fields[1]), "set.element");
      return `q:${value.join(",")}`;
    }
    case "c": {
      const value = testCase.cloneStream().integer(BigInt(fields[0]), BigInt(fields[1]));
      return `c:${value}`;
    }
  }
  throw new Error(`unknown draw op ${head}`);
}
