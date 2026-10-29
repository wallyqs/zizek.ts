// Code generated from ZizekIR by emitter/emit.go; DO NOT EDIT.
//
// u64 and i64 are bigint and every u64 result is masked back to 64 bits; f64 is
// the platform double; bytes is a Uint8Array; and the growable buffers behind
// core.strbuf / core.bytebuf are plain number arrays.

export const MASK = (1n << 64n) - 1n;

const scratch = new DataView(new ArrayBuffer(8));

export function f2bits(value: number): bigint {
  scratch.setFloat64(0, value);
  return scratch.getBigUint64(0);
}

export function bits2f(value: bigint): number {
  scratch.setBigUint64(0, value & MASK);
  return scratch.getFloat64(0);
}

export function rev64(value: bigint): bigint {
  let result = 0n;
  for (let i = 0; i < 64; i++) {
    result = ((result << 1n) | (value & 1n)) & MASK;
    value >>= 1n;
  }
  return result;
}

// Reads the sign bit rather than comparing, so -0.0 is negative here exactly as
// it is in the Rust reference.
function signbit(value: number): boolean {
  return f2bits(value) >> 63n === 1n;
}

function isInf(value: number): boolean {
  return value === Infinity || value === -Infinity;
}

// Rust saturates an out-of-range f64 -> u64 cast; JavaScript's BigInt would
// throw on a non-integral or infinite value, so the saturation is explicit.
function f64ToU64(value: number): bigint {
  if (Number.isNaN(value) || value <= 0) return 0n;
  if (value >= 18446744073709551616) return MASK;
  return BigInt(Math.trunc(value));
}

function blen(data: ArrayLike<number>): bigint {
  return BigInt(data.length);
}

function bget(data: ArrayLike<number>, index: bigint): bigint {
  return BigInt(data[Number(index)]);
}

function bslice(data: ArrayLike<number>, start: bigint, end: bigint): number[] {
  const out: number[] = [];
  for (let i = Number(start); i < Number(end); i++) {
    out.push(data[i]);
  }
  return out;
}

function bytesOf(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i);
  }
  return out;
}

function toStr(buffer: number[]): string {
  let out = "";
  for (const byte of buffer) {
    out += String.fromCharCode(byte);
  }
  return out;
}

function fromStr(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    out.push(text.charCodeAt(i));
  }
  return out;
}

export function encodeExponent(biased_exp: bigint): bigint {
  let c2047!: bigint;
  let is2047!: boolean;
  let c1023!: bigint;
  let ge!: boolean;
  let r!: bigint;
  let c2046!: bigint;
  let r2!: bigint;
  c2047 = 2047n;
  is2047 = (biased_exp === c2047);
  if (is2047) {
    return c2047;
  }
  c1023 = 1023n;
  ge = (biased_exp >= c1023);
  if (ge) {
    r = ((biased_exp - c1023) & MASK);
    return r;
  }
  c2046 = 2046n;
  r2 = ((c2046 - biased_exp) & MASK);
  return r2;
}

export function decodeExponent(enc: bigint): bigint {
  let c2047!: bigint;
  let is2047!: boolean;
  let c1023!: bigint;
  let le!: boolean;
  let r!: bigint;
  let c2046!: bigint;
  let r2!: bigint;
  c2047 = 2047n;
  is2047 = (enc === c2047);
  if (is2047) {
    return c2047;
  }
  c1023 = 1023n;
  le = (enc <= c1023);
  if (le) {
    r = ((enc + c1023) & MASK);
    return r;
  }
  c2046 = 2046n;
  r2 = ((c2046 - enc) & MASK);
  return r2;
}

export function reverseBitsN(val: bigint, n: bigint): bigint {
  let c0!: bigint;
  let isz!: boolean;
  let c64!: bigint;
  let rev!: bigint;
  let sh!: bigint;
  let r!: bigint;
  c0 = 0n;
  isz = (n === c0);
  if (isz) {
    return c0;
  }
  c64 = 64n;
  rev = rev64(val);
  sh = ((c64 - n) & MASK);
  r = (rev >> sh);
  return r;
}

export function updateMantissa(unbiased_exp: bigint, mantissa: bigint): bigint {
  let zero_i!: bigint;
  let le0!: boolean;
  let c52!: bigint;
  let r!: bigint;
  let c51i!: bigint;
  let le51!: boolean;
  let c52i!: bigint;
  let nfi!: bigint;
  let n_frac!: bigint;
  let one!: bigint;
  let shifted!: bigint;
  let frac_mask!: bigint;
  let frac!: bigint;
  let xored!: bigint;
  let revfrac!: bigint;
  zero_i = 0n;
  le0 = (unbiased_exp <= zero_i);
  if (le0) {
    c52 = 52n;
    r = reverseBitsN(mantissa, c52);
    return r;
  }
  c51i = 51n;
  le51 = (unbiased_exp <= c51i);
  if (le51) {
    c52i = 52n;
    nfi = (c52i - unbiased_exp);
    n_frac = (nfi & MASK);
    one = 1n;
    shifted = ((one << n_frac) & MASK);
    frac_mask = ((shifted - one) & MASK);
    frac = (mantissa & frac_mask);
    xored = (mantissa ^ frac);
    revfrac = reverseBitsN(frac, n_frac);
    r = (xored | revfrac);
    return r;
  }
  return mantissa;
}

export function isSimpleFloat(x: number): boolean {
  let sb!: boolean;
  let inf!: boolean;
  let nan!: boolean;
  let sb_or_inf!: boolean;
  let bad!: boolean;
  let false_!: boolean;
  let pow56f!: number;
  let ge!: boolean;
  let i!: bigint;
  let back!: number;
  let eqv!: boolean;
  let pow56!: bigint;
  let lt!: boolean;
  let res!: boolean;
  sb = signbit(x);
  inf = isInf(x);
  nan = Number.isNaN(x);
  sb_or_inf = (sb || inf);
  bad = (sb_or_inf || nan);
  false_ = false;
  if (bad) {
    return false_;
  }
  pow56f = 72057594037927936;
  ge = (x >= pow56f);
  if (ge) {
    return false_;
  }
  i = f64ToU64(x);
  back = Number(i);
  eqv = (back === x);
  pow56 = 72057594037927936n;
  lt = (i < pow56);
  res = (eqv && lt);
  return res;
}

export function floatToIndex(x: number): bigint {
  let simple!: boolean;
  let si!: bigint;
  let bits!: bigint;
  let c52!: bigint;
  let shr!: bigint;
  let c2047!: bigint;
  let biased_exp!: bigint;
  let mmask!: bigint;
  let mantissa!: bigint;
  let be_i!: bigint;
  let c1023i!: bigint;
  let unbiased_exp!: bigint;
  let mantissa_enc!: bigint;
  let exp_enc!: bigint;
  let bit63!: bigint;
  let expsh!: bigint;
  let hi!: bigint;
  let r!: bigint;
  simple = isSimpleFloat(x);
  if (simple) {
    si = f64ToU64(x);
    return si;
  }
  bits = f2bits(x);
  c52 = 52n;
  shr = (bits >> c52);
  c2047 = 2047n;
  biased_exp = (shr & c2047);
  mmask = 4503599627370495n;
  mantissa = (bits & mmask);
  be_i = BigInt.asIntN(64, biased_exp);
  c1023i = 1023n;
  unbiased_exp = (be_i - c1023i);
  mantissa_enc = updateMantissa(unbiased_exp, mantissa);
  exp_enc = encodeExponent(biased_exp);
  bit63 = 9223372036854775808n;
  expsh = ((exp_enc << c52) & MASK);
  hi = (bit63 | expsh);
  r = (hi | mantissa_enc);
  return r;
}

export function indexToFloat(i: bigint): number {
  let c63!: bigint;
  let top!: bigint;
  let c0!: bigint;
  let isint!: boolean;
  let m56!: bigint;
  let integral!: bigint;
  let f!: number;
  let c52!: bigint;
  let shr!: bigint;
  let c2047!: bigint;
  let exp_enc!: bigint;
  let biased_exp!: bigint;
  let mmask!: bigint;
  let mantissa_enc!: bigint;
  let be_i!: bigint;
  let c1023i!: bigint;
  let unbiased_exp!: bigint;
  let mantissa!: bigint;
  let besh!: bigint;
  let bitsr!: bigint;
  let f2!: number;
  c63 = 63n;
  top = (i >> c63);
  c0 = 0n;
  isint = (top === c0);
  if (isint) {
    m56 = 72057594037927935n;
    integral = (i & m56);
    f = Number(integral);
    return f;
  }
  c52 = 52n;
  shr = (i >> c52);
  c2047 = 2047n;
  exp_enc = (shr & c2047);
  biased_exp = decodeExponent(exp_enc);
  mmask = 4503599627370495n;
  mantissa_enc = (i & mmask);
  be_i = BigInt.asIntN(64, biased_exp);
  c1023i = 1023n;
  unbiased_exp = (be_i - c1023i);
  mantissa = updateMantissa(unbiased_exp, mantissa_enc);
  besh = ((biased_exp << c52) & MASK);
  bitsr = (besh | mantissa);
  f2 = bits2f(bitsr);
  return f2;
}

export function minReversedInRange(lo: bigint, hi: bigint, n: bigint): bigint {
  let zero_i!: bigint;
  let isz!: boolean;
  let c0!: bigint;
  let one!: bigint;
  let lop1!: bigint;
  let k_lo!: bigint;
  let k_hi!: bigint;
  let le!: boolean;
  let onei!: bigint;
  let nm1!: bigint;
  let rec!: bigint;
  let two!: bigint;
  let r!: bigint;
  zero_i = 0n;
  isz = (n === zero_i);
  c0 = 0n;
  if (isz) {
    return c0;
  }
  one = 1n;
  lop1 = ((lo + one) & MASK);
  k_lo = (lop1 >> one);
  k_hi = (hi >> one);
  le = (k_lo <= k_hi);
  if (le) {
    onei = 1n;
    nm1 = (n - onei);
    rec = minReversedInRange(k_lo, k_hi, nm1);
    two = 2n;
    r = ((rec * two) & MASK);
    return r;
  }
  return lo;
}

export function simplestInRange(lo: number, hi: number): number {
  let c!: number;
  let cle!: boolean;
  let pow56f!: number;
  let clt!: boolean;
  let inrange!: boolean;
  let lo_bits!: bigint;
  let hi_bits!: bigint;
  let c52!: bigint;
  let e_lo!: bigint;
  let e_hi!: bigint;
  let mmask!: bigint;
  let m_lo!: bigint;
  let m_hi!: bigint;
  let c1023!: bigint;
  let cond!: boolean;
  let ncond!: boolean;
  let e!: bigint;
  let m_min!: bigint;
  let m_max!: bigint;
  let eq_hilo!: boolean;
  let ne_hilo!: boolean;
  let eq_lohi!: boolean;
  let ne_lohi!: boolean;
  let zero!: bigint;
  let c1023i!: bigint;
  let e_i!: bigint;
  let unbiased!: bigint;
  let c52i!: bigint;
  let ge52!: boolean;
  let esh0!: bigint;
  let bitsr0!: bigint;
  let f0!: number;
  let zero_i!: bigint;
  let le0!: boolean;
  let n_frac!: bigint;
  let nle0!: boolean;
  let sub!: bigint;
  let one!: bigint;
  let shl1!: bigint;
  let low_mask!: bigint;
  let h!: bigint;
  let l_lo!: bigint;
  let l_hi!: bigint;
  let minrev!: bigint;
  let hsh!: bigint;
  let m_best!: bigint;
  let esh!: bigint;
  let bitsr!: bigint;
  let f!: number;
  c = Math.ceil(lo);
  cle = (c <= hi);
  pow56f = 72057594037927936;
  clt = (c < pow56f);
  inrange = (cle && clt);
  if (inrange) {
    return c;
  }
  lo_bits = f2bits(lo);
  hi_bits = f2bits(hi);
  c52 = 52n;
  e_lo = (lo_bits >> c52);
  e_hi = (hi_bits >> c52);
  mmask = 4503599627370495n;
  m_lo = (lo_bits & mmask);
  m_hi = (hi_bits & mmask);
  c1023 = 1023n;
  cond = (e_lo >= c1023);
  ncond = (!cond);
  e = e_lo;
  m_min = m_lo;
  m_max = m_hi;
  eq_hilo = (e_hi === e_lo);
  ne_hilo = (!eq_hilo);
  if (ne_hilo) {
    m_max = mmask;
  }
  if (ncond) {
    e = e_hi;
    m_max = m_hi;
    eq_lohi = (e_lo === e_hi);
    ne_lohi = (!eq_lohi);
    if (ne_lohi) {
      zero = 0n;
      m_min = zero;
    }
  }
  c1023i = 1023n;
  e_i = BigInt.asIntN(64, e);
  unbiased = (e_i - c1023i);
  c52i = 52n;
  ge52 = (unbiased >= c52i);
  if (ge52) {
    esh0 = ((e << c52) & MASK);
    bitsr0 = (esh0 | m_min);
    f0 = bits2f(bitsr0);
    return f0;
  }
  zero_i = 0n;
  le0 = (unbiased <= zero_i);
  n_frac = c52i;
  nle0 = (!le0);
  if (nle0) {
    sub = (c52i - unbiased);
    n_frac = sub;
  }
  one = 1n;
  shl1 = ((one << n_frac) & MASK);
  low_mask = ((shl1 - one) & MASK);
  h = (m_min >> n_frac);
  l_lo = (m_min & low_mask);
  l_hi = (m_max & low_mask);
  minrev = minReversedInRange(l_lo, l_hi, n_frac);
  hsh = ((h << n_frac) & MASK);
  m_best = (hsh | minrev);
  esh = ((e << c52) & MASK);
  bitsr = (esh | m_best);
  f = bits2f(bitsr);
  return f;
}

export function base64Encode(data: Uint8Array): string {
  let alphabet!: Uint8Array;
  let out!: number[];
  let n!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let i3!: bigint;
  let u0!: bigint;
  let c6!: bigint;
  let c8!: bigint;
  let c12!: bigint;
  let c16!: bigint;
  let c18!: bigint;
  let c3f!: bigint;
  let eq!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let rem!: bigint;
  let b0!: bigint;
  let b1!: bigint;
  let b2!: bigint;
  let has1!: boolean;
  let p1!: bigint;
  let has2!: boolean;
  let p2!: bigint;
  let s16!: bigint;
  let s8!: bigint;
  let acc0!: bigint;
  let acc!: bigint;
  let t0!: bigint;
  let k0!: bigint;
  let d0!: bigint;
  let t1!: bigint;
  let k1!: bigint;
  let d1!: bigint;
  let d2!: bigint;
  let t2!: bigint;
  let k2!: bigint;
  let d3!: bigint;
  let k3!: bigint;
  alphabet = bytesOf("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
  out = [];
  n = blen(data);
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  i3 = 3n;
  u0 = 0n;
  c6 = 6n;
  c8 = 8n;
  c12 = 12n;
  c16 = 16n;
  c18 = 18n;
  c3f = 63n;
  eq = 61n;
  pos = i0;
  for (;;) {
    done = (pos >= n);
    if (done) {
      break;
    }
    rem = (n - pos);
    b0 = bget(data, pos);
    b1 = u0;
    b2 = u0;
    has1 = (rem > i1);
    if (has1) {
      p1 = (pos + i1);
      b1 = bget(data, p1);
    }
    has2 = (rem > i2);
    if (has2) {
      p2 = (pos + i2);
      b2 = bget(data, p2);
    }
    s16 = ((b0 << c16) & MASK);
    s8 = ((b1 << c8) & MASK);
    acc0 = (s16 | s8);
    acc = (acc0 | b2);
    t0 = (acc >> c18);
    k0 = (t0 & c3f);
    d0 = bget(alphabet, k0);
    out.push(Number(d0 & 0xffn));
    t1 = (acc >> c12);
    k1 = (t1 & c3f);
    d1 = bget(alphabet, k1);
    out.push(Number(d1 & 0xffn));
    d2 = eq;
    if (has1) {
      t2 = (acc >> c6);
      k2 = (t2 & c3f);
      d2 = bget(alphabet, k2);
    }
    out.push(Number(d2 & 0xffn));
    d3 = eq;
    if (has2) {
      k3 = (acc & c3f);
      d3 = bget(alphabet, k3);
    }
    out.push(Number(d3 & 0xffn));
    pos = (pos + i3);
  }
  return toStr(out);
}

export function base64Value(c: bigint): bigint {
  let a_upper!: bigint;
  let z_upper!: bigint;
  let a_lower!: bigint;
  let z_lower!: bigint;
  let zero!: bigint;
  let nine!: bigint;
  let plus!: bigint;
  let slash!: bigint;
  let c26!: bigint;
  let c52!: bigint;
  let c62!: bigint;
  let c63!: bigint;
  let invalid!: bigint;
  let value!: bigint;
  let upper_lo!: boolean;
  let upper_hi!: boolean;
  let is_upper!: boolean;
  let lower_lo!: boolean;
  let lower_hi!: boolean;
  let is_lower!: boolean;
  let lower_offset!: bigint;
  let digit_lo!: boolean;
  let digit_hi!: boolean;
  let is_digit!: boolean;
  let digit_offset!: bigint;
  let is_plus!: boolean;
  let is_slash!: boolean;
  a_upper = 65n;
  z_upper = 90n;
  a_lower = 97n;
  z_lower = 122n;
  zero = 48n;
  nine = 57n;
  plus = 43n;
  slash = 47n;
  c26 = 26n;
  c52 = 52n;
  c62 = 62n;
  c63 = 63n;
  invalid = 64n;
  value = invalid;
  upper_lo = (c >= a_upper);
  upper_hi = (c <= z_upper);
  is_upper = (upper_lo && upper_hi);
  if (is_upper) {
    value = ((c - a_upper) & MASK);
  }
  lower_lo = (c >= a_lower);
  lower_hi = (c <= z_lower);
  is_lower = (lower_lo && lower_hi);
  if (is_lower) {
    lower_offset = ((c - a_lower) & MASK);
    value = ((lower_offset + c26) & MASK);
  }
  digit_lo = (c >= zero);
  digit_hi = (c <= nine);
  is_digit = (digit_lo && digit_hi);
  if (is_digit) {
    digit_offset = ((c - zero) & MASK);
    value = ((digit_offset + c52) & MASK);
  }
  is_plus = (c === plus);
  if (is_plus) {
    value = c62;
  }
  is_slash = (c === slash);
  if (is_slash) {
    value = c63;
  }
  return value;
}

export function base64Decode(data: Uint8Array): Uint8Array | null {
  let out!: number[];
  let none!: Uint8Array | null;
  let n!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let i3!: bigint;
  let i4!: bigint;
  let u0!: bigint;
  let u6!: bigint;
  let u8!: bigint;
  let u12!: bigint;
  let u16!: bigint;
  let u18!: bigint;
  let invalid_value!: bigint;
  let padding!: bigint;
  let rem!: bigint;
  let short_!: boolean;
  let bad_length!: boolean;
  let pos!: bigint;
  let done!: boolean;
  let p1!: bigint;
  let p2!: bigint;
  let p3!: bigint;
  let next_!: bigint;
  let last!: boolean;
  let b0!: bigint;
  let b1!: bigint;
  let b2!: bigint;
  let b3!: bigint;
  let c0!: bigint;
  let c1!: bigint;
  let bad_c0!: boolean;
  let bad_c1!: boolean;
  let pad2!: boolean;
  let pad3!: boolean;
  let any_padding!: boolean;
  let not_last!: boolean;
  let padding_before_tail!: boolean;
  let not_pad3!: boolean;
  let bad_padding!: boolean;
  let c2!: bigint;
  let not_pad2!: boolean;
  let bad_c2!: boolean;
  let c3!: bigint;
  let bad_c3!: boolean;
  let s18!: bigint;
  let s12!: bigint;
  let s6!: bigint;
  let acc0!: bigint;
  let acc1!: bigint;
  let acc!: bigint;
  let out0!: bigint;
  let out1!: bigint;
  let some!: Uint8Array | null;
  out = [];
  none = null;
  n = blen(data);
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  i3 = 3n;
  i4 = 4n;
  u0 = 0n;
  u6 = 6n;
  u8 = 8n;
  u12 = 12n;
  u16 = 16n;
  u18 = 18n;
  invalid_value = 64n;
  padding = 61n;
  rem = n;
  for (;;) {
    short_ = (rem < i4);
    if (short_) {
      break;
    }
    rem = (rem - i4);
  }
  bad_length = (rem !== i0);
  if (bad_length) {
    return none;
  }
  pos = i0;
  for (;;) {
    done = (pos >= n);
    if (done) {
      break;
    }
    p1 = (pos + i1);
    p2 = (pos + i2);
    p3 = (pos + i3);
    next_ = (pos + i4);
    last = (next_ === n);
    b0 = bget(data, pos);
    b1 = bget(data, p1);
    b2 = bget(data, p2);
    b3 = bget(data, p3);
    c0 = base64Value(b0);
    c1 = base64Value(b1);
    bad_c0 = (c0 >= invalid_value);
    if (bad_c0) {
      return none;
    }
    bad_c1 = (c1 >= invalid_value);
    if (bad_c1) {
      return none;
    }
    pad2 = (b2 === padding);
    pad3 = (b3 === padding);
    any_padding = (pad2 || pad3);
    not_last = (!last);
    padding_before_tail = (any_padding && not_last);
    if (padding_before_tail) {
      return none;
    }
    not_pad3 = (!pad3);
    bad_padding = (pad2 && not_pad3);
    if (bad_padding) {
      return none;
    }
    c2 = u0;
    not_pad2 = (!pad2);
    if (not_pad2) {
      c2 = base64Value(b2);
      bad_c2 = (c2 >= invalid_value);
      if (bad_c2) {
        return none;
      }
    }
    c3 = u0;
    if (not_pad3) {
      c3 = base64Value(b3);
      bad_c3 = (c3 >= invalid_value);
      if (bad_c3) {
        return none;
      }
    }
    s18 = ((c0 << u18) & MASK);
    s12 = ((c1 << u12) & MASK);
    s6 = ((c2 << u6) & MASK);
    acc0 = (s18 | s12);
    acc1 = (acc0 | s6);
    acc = (acc1 | c3);
    out0 = (acc >> u16);
    out.push(Number(out0 & 0xffn));
    if (not_pad2) {
      out1 = (acc >> u8);
      out.push(Number(out1 & 0xffn));
    }
    if (not_pad3) {
      out.push(Number(acc & 0xffn));
    }
    pos = next_;
  }
  some = Uint8Array.from(out);
  return some;
}

export function u64AsI64(value: bigint): bigint {
  let signed_!: bigint;
  signed_ = BigInt.asIntN(64, value);
  return signed_;
}

export function twosComplementLe(data: Uint8Array): Uint8Array {
  let out!: number[];
  let n!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let u1!: bigint;
  let u255!: bigint;
  let carry!: boolean;
  let pos!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let inverted!: bigint;
  let sum!: bigint;
  out = [];
  n = blen(data);
  i0 = 0n;
  i1 = 1n;
  u1 = 1n;
  u255 = 255n;
  carry = true;
  pos = i0;
  for (;;) {
    done = (pos >= n);
    if (done) {
      break;
    }
    byte_ = bget(data, pos);
    inverted = (byte_ ^ u255);
    sum = inverted;
    if (carry) {
      sum = ((inverted + u1) & MASK);
      carry = (sum > u255);
    }
    out.push(Number(sum & 0xffn));
    pos = (pos + i1);
  }
  return Uint8Array.from(out);
}

export function canonicalizeSignedLe(data: Uint8Array): Uint8Array {
  let out!: number[];
  let n!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let u0!: bigint;
  let u128!: bigint;
  let u255!: bigint;
  let empty!: boolean;
  let keep!: bigint;
  let one_left!: boolean;
  let last_pos!: bigint;
  let prev_pos!: bigint;
  let last!: bigint;
  let prev!: bigint;
  let prev_sign!: bigint;
  let prev_negative!: boolean;
  let prev_positive!: boolean;
  let last_zero!: boolean;
  let last_ff!: boolean;
  let positive_extension!: boolean;
  let negative_extension!: boolean;
  let redundant!: boolean;
  let needed!: boolean;
  let pos!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  out = [];
  n = blen(data);
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  u0 = 0n;
  u128 = 128n;
  u255 = 255n;
  empty = (n === i0);
  if (empty) {
    out.push(Number(u0 & 0xffn));
    return Uint8Array.from(out);
  }
  keep = n;
  for (;;) {
    one_left = (keep <= i1);
    if (one_left) {
      break;
    }
    last_pos = (keep - i1);
    prev_pos = (keep - i2);
    last = bget(data, last_pos);
    prev = bget(data, prev_pos);
    prev_sign = (prev & u128);
    prev_negative = (prev_sign !== u0);
    prev_positive = (!prev_negative);
    last_zero = (last === u0);
    last_ff = (last === u255);
    positive_extension = (last_zero && prev_positive);
    negative_extension = (last_ff && prev_negative);
    redundant = (positive_extension || negative_extension);
    needed = (!redundant);
    if (needed) {
      break;
    }
    keep = (keep - i1);
  }
  pos = i0;
  for (;;) {
    done = (pos >= keep);
    if (done) {
      break;
    }
    byte_ = bget(data, pos);
    out.push(Number(byte_ & 0xffn));
    pos = (pos + i1);
  }
  return Uint8Array.from(out);
}

export function signedAbsLe(data: Uint8Array): Uint8Array {
  let value!: number[];
  let n!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u128!: bigint;
  let last_pos!: bigint;
  let last!: bigint;
  let sign!: bigint;
  let negative!: boolean;
  let positive!: boolean;
  let magnitude!: number[];
  let out!: number[];
  let pos!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let mag_last!: bigint;
  let mag_sign!: bigint;
  let needs_zero!: boolean;
  value = Array.from(canonicalizeSignedLe(data));
  n = blen(value);
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u128 = 128n;
  last_pos = (n - i1);
  last = bget(value, last_pos);
  sign = (last & u128);
  negative = (sign !== u0);
  positive = (!negative);
  if (positive) {
    return Uint8Array.from(value);
  }
  magnitude = Array.from(twosComplementLe(Uint8Array.from(value)));
  out = [];
  pos = i0;
  for (;;) {
    done = (pos >= n);
    if (done) {
      break;
    }
    byte_ = bget(magnitude, pos);
    out.push(Number(byte_ & 0xffn));
    pos = (pos + i1);
  }
  mag_last = bget(magnitude, last_pos);
  mag_sign = (mag_last & u128);
  needs_zero = (mag_sign !== u0);
  if (needs_zero) {
    out.push(Number(u0 & 0xffn));
  }
  return Uint8Array.from(out);
}

export function signedNegateLe(data: Uint8Array): Uint8Array {
  let value!: number[];
  let out!: number[];
  let n!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u128!: bigint;
  let u255!: bigint;
  let last_pos!: bigint;
  let last!: bigint;
  let sign!: bigint;
  let negative!: boolean;
  let extension!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let negated!: number[];
  let canonical!: number[];
  value = Array.from(canonicalizeSignedLe(data));
  out = [];
  n = blen(value);
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u128 = 128n;
  u255 = 255n;
  last_pos = (n - i1);
  last = bget(value, last_pos);
  sign = (last & u128);
  negative = (sign !== u0);
  extension = u0;
  if (negative) {
    extension = u255;
  }
  pos = i0;
  for (;;) {
    done = (pos >= n);
    if (done) {
      break;
    }
    byte_ = bget(value, pos);
    out.push(Number(byte_ & 0xffn));
    pos = (pos + i1);
  }
  out.push(Number(extension & 0xffn));
  negated = Array.from(twosComplementLe(Uint8Array.from(out)));
  canonical = Array.from(canonicalizeSignedLe(Uint8Array.from(negated)));
  return Uint8Array.from(canonical);
}

export function signedAddLe(left_raw: Uint8Array, right_raw: Uint8Array): Uint8Array {
  let left!: number[];
  let right!: number[];
  let out!: number[];
  let left_n!: bigint;
  let right_n!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u8!: bigint;
  let u128!: bigint;
  let u255!: bigint;
  let left_last_pos!: bigint;
  let right_last_pos!: bigint;
  let left_last!: bigint;
  let right_last!: bigint;
  let left_sign!: bigint;
  let right_sign!: bigint;
  let left_negative!: boolean;
  let right_negative!: boolean;
  let left_extension!: bigint;
  let right_extension!: bigint;
  let width!: bigint;
  let right_longer!: boolean;
  let carry!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let left_byte!: bigint;
  let left_present!: boolean;
  let right_byte!: bigint;
  let right_present!: boolean;
  let partial!: bigint;
  let sum!: bigint;
  let out_byte!: bigint;
  let canonical!: number[];
  left = Array.from(canonicalizeSignedLe(left_raw));
  right = Array.from(canonicalizeSignedLe(right_raw));
  out = [];
  left_n = blen(left);
  right_n = blen(right);
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u8 = 8n;
  u128 = 128n;
  u255 = 255n;
  left_last_pos = (left_n - i1);
  right_last_pos = (right_n - i1);
  left_last = bget(left, left_last_pos);
  right_last = bget(right, right_last_pos);
  left_sign = (left_last & u128);
  right_sign = (right_last & u128);
  left_negative = (left_sign !== u0);
  right_negative = (right_sign !== u0);
  left_extension = u0;
  if (left_negative) {
    left_extension = u255;
  }
  right_extension = u0;
  if (right_negative) {
    right_extension = u255;
  }
  width = left_n;
  right_longer = (right_n > left_n);
  if (right_longer) {
    width = right_n;
  }
  width = (width + i1);
  carry = u0;
  pos = i0;
  for (;;) {
    done = (pos >= width);
    if (done) {
      break;
    }
    left_byte = left_extension;
    left_present = (pos < left_n);
    if (left_present) {
      left_byte = bget(left, pos);
    }
    right_byte = right_extension;
    right_present = (pos < right_n);
    if (right_present) {
      right_byte = bget(right, pos);
    }
    partial = ((left_byte + right_byte) & MASK);
    sum = ((partial + carry) & MASK);
    out_byte = (sum & u255);
    out.push(Number(out_byte & 0xffn));
    carry = (sum >> u8);
    pos = (pos + i1);
  }
  canonical = Array.from(canonicalizeSignedLe(Uint8Array.from(out)));
  return Uint8Array.from(canonical);
}

export function signedSubLe(left: Uint8Array, right: Uint8Array): Uint8Array {
  let negative_right!: number[];
  let result!: number[];
  negative_right = Array.from(signedNegateLe(right));
  result = Array.from(signedAddLe(left, Uint8Array.from(negative_right)));
  return Uint8Array.from(result);
}

export function positiveShr1Le(data: Uint8Array): Uint8Array {
  let value!: number[];
  let out!: number[];
  let n!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let u1!: bigint;
  let u7!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let current!: bigint;
  let shifted!: bigint;
  let out_byte!: bigint;
  let next_pos!: bigint;
  let has_next!: boolean;
  let next_!: bigint;
  let next_low!: bigint;
  let incoming!: bigint;
  let canonical!: number[];
  value = Array.from(canonicalizeSignedLe(data));
  out = [];
  n = blen(value);
  i0 = 0n;
  i1 = 1n;
  u1 = 1n;
  u7 = 7n;
  pos = i0;
  for (;;) {
    done = (pos >= n);
    if (done) {
      break;
    }
    current = bget(value, pos);
    shifted = (current >> u1);
    out_byte = shifted;
    next_pos = (pos + i1);
    has_next = (next_pos < n);
    if (has_next) {
      next_ = bget(value, next_pos);
      next_low = (next_ & u1);
      incoming = ((next_low << u7) & MASK);
      out_byte = (shifted | incoming);
    }
    out.push(Number(out_byte & 0xffn));
    pos = next_pos;
  }
  canonical = Array.from(canonicalizeSignedLe(Uint8Array.from(out)));
  return Uint8Array.from(canonical);
}

export function signedMulLe(left_raw: Uint8Array, right_raw: Uint8Array): Uint8Array {
  let left_value!: number[];
  let right_value!: number[];
  let left_n!: bigint;
  let right_n!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u128!: bigint;
  let left_last_pos!: bigint;
  let right_last_pos!: bigint;
  let left_last!: bigint;
  let right_last!: bigint;
  let left_sign!: bigint;
  let right_sign!: bigint;
  let left_negative!: boolean;
  let right_negative!: boolean;
  let negative_result!: boolean;
  let multiplicand!: number[];
  let multiplier!: number[];
  let product!: number[];
  let low!: bigint;
  let nonzero!: boolean;
  let multiplier_n!: bigint;
  let more_bytes!: boolean;
  let has_value!: boolean;
  let done!: boolean;
  let low_bit!: bigint;
  let odd!: boolean;
  left_value = Array.from(canonicalizeSignedLe(left_raw));
  right_value = Array.from(canonicalizeSignedLe(right_raw));
  left_n = blen(left_value);
  right_n = blen(right_value);
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  u128 = 128n;
  left_last_pos = (left_n - i1);
  right_last_pos = (right_n - i1);
  left_last = bget(left_value, left_last_pos);
  right_last = bget(right_value, right_last_pos);
  left_sign = (left_last & u128);
  right_sign = (right_last & u128);
  left_negative = (left_sign !== u0);
  right_negative = (right_sign !== u0);
  negative_result = (left_negative !== right_negative);
  multiplicand = Array.from(signedAbsLe(Uint8Array.from(left_value)));
  multiplier = Array.from(signedAbsLe(Uint8Array.from(right_value)));
  product = [];
  product.push(Number(u0 & 0xffn));
  for (;;) {
    low = bget(multiplier, u0);
    nonzero = (low !== u0);
    multiplier_n = blen(multiplier);
    more_bytes = (multiplier_n > i1);
    has_value = (nonzero || more_bytes);
    done = (!has_value);
    if (done) {
      break;
    }
    low_bit = (low & u1);
    odd = (low_bit !== u0);
    if (odd) {
      product = Array.from(signedAddLe(Uint8Array.from(product), Uint8Array.from(multiplicand)));
    }
    multiplicand = Array.from(signedAddLe(Uint8Array.from(multiplicand), Uint8Array.from(multiplicand)));
    multiplier = Array.from(positiveShr1Le(Uint8Array.from(multiplier)));
  }
  if (negative_result) {
    product = Array.from(signedNegateLe(Uint8Array.from(product)));
  }
  return Uint8Array.from(product);
}

export function positiveDivLeNonzero(dividend_raw: Uint8Array, divisor_raw: Uint8Array): Uint8Array {
  let remainder!: number[];
  let scaled_divisor!: number[];
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let quotient!: number[];
  let bit!: number[];
  let scale_cmp!: bigint;
  let can_scale!: boolean;
  let stop_scaling!: boolean;
  let bit_low!: bigint;
  let bit_n!: bigint;
  let bit_nonzero!: boolean;
  let bit_more!: boolean;
  let has_bit!: boolean;
  let done!: boolean;
  let cmp!: bigint;
  let can_subtract!: boolean;
  remainder = Array.from(signedAbsLe(dividend_raw));
  scaled_divisor = Array.from(signedAbsLe(divisor_raw));
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  quotient = [];
  quotient.push(Number(u0 & 0xffn));
  bit = [];
  bit.push(Number(u1 & 0xffn));
  for (;;) {
    scale_cmp = signedCompareLe(Uint8Array.from(scaled_divisor), Uint8Array.from(remainder));
    can_scale = (scale_cmp <= i0);
    stop_scaling = (!can_scale);
    if (stop_scaling) {
      break;
    }
    scaled_divisor = Array.from(signedAddLe(Uint8Array.from(scaled_divisor), Uint8Array.from(scaled_divisor)));
    bit = Array.from(signedAddLe(Uint8Array.from(bit), Uint8Array.from(bit)));
  }
  for (;;) {
    scaled_divisor = Array.from(positiveShr1Le(Uint8Array.from(scaled_divisor)));
    bit = Array.from(positiveShr1Le(Uint8Array.from(bit)));
    bit_low = bget(bit, u0);
    bit_n = blen(bit);
    bit_nonzero = (bit_low !== u0);
    bit_more = (bit_n > i1);
    has_bit = (bit_nonzero || bit_more);
    done = (!has_bit);
    if (done) {
      break;
    }
    cmp = signedCompareLe(Uint8Array.from(scaled_divisor), Uint8Array.from(remainder));
    can_subtract = (cmp <= i0);
    if (can_subtract) {
      remainder = Array.from(signedSubLe(Uint8Array.from(remainder), Uint8Array.from(scaled_divisor)));
      quotient = Array.from(signedAddLe(Uint8Array.from(quotient), Uint8Array.from(bit)));
    }
  }
  return Uint8Array.from(quotient);
}

export function positiveRemLeNonzero(dividend: Uint8Array, divisor: Uint8Array): Uint8Array {
  let positive_dividend!: number[];
  let positive_divisor!: number[];
  let quotient!: number[];
  let product!: number[];
  let remainder!: number[];
  positive_dividend = Array.from(signedAbsLe(dividend));
  positive_divisor = Array.from(signedAbsLe(divisor));
  quotient = Array.from(positiveDivLeNonzero(Uint8Array.from(positive_dividend), Uint8Array.from(positive_divisor)));
  product = Array.from(signedMulLe(Uint8Array.from(quotient), Uint8Array.from(positive_divisor)));
  remainder = Array.from(signedSubLe(Uint8Array.from(positive_dividend), Uint8Array.from(product)));
  return Uint8Array.from(remainder);
}

export function positivePowLe(base_raw: Uint8Array, exponent: bigint): Uint8Array {
  let u0!: bigint;
  let u1!: bigint;
  let result!: number[];
  let factor!: number[];
  let power!: bigint;
  let done!: boolean;
  let low_bit!: bigint;
  let odd!: boolean;
  u0 = 0n;
  u1 = 1n;
  result = [];
  result.push(Number(u1 & 0xffn));
  factor = Array.from(signedAbsLe(base_raw));
  power = exponent;
  for (;;) {
    done = (power === u0);
    if (done) {
      break;
    }
    low_bit = (power & u1);
    odd = (low_bit !== u0);
    if (odd) {
      result = Array.from(signedMulLe(Uint8Array.from(result), Uint8Array.from(factor)));
    }
    factor = Array.from(signedMulLe(Uint8Array.from(factor), Uint8Array.from(factor)));
    power = (power >> u1);
  }
  return Uint8Array.from(result);
}

export function positiveMulAddSmallLe(value_raw: Uint8Array, factor: bigint, addend: bigint): Uint8Array {
  let value!: number[];
  let n!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let out!: number[];
  let carry!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let scaled!: bigint;
  let sum!: bigint;
  let out_byte!: bigint;
  let drained!: boolean;
  let carry_byte!: bigint;
  let canonical!: number[];
  value = Array.from(signedAbsLe(value_raw));
  n = blen(value);
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u8 = 8n;
  u255 = 255n;
  out = [];
  carry = addend;
  pos = i0;
  for (;;) {
    done = (pos >= n);
    if (done) {
      break;
    }
    byte_ = bget(value, pos);
    scaled = ((byte_ * factor) & MASK);
    sum = ((scaled + carry) & MASK);
    out_byte = (sum & u255);
    out.push(Number(out_byte & 0xffn));
    carry = (sum >> u8);
    pos = (pos + i1);
  }
  for (;;) {
    drained = (carry === u0);
    if (drained) {
      break;
    }
    carry_byte = (carry & u255);
    out.push(Number(carry_byte & 0xffn));
    carry = (carry >> u8);
  }
  out.push(Number(u0 & 0xffn));
  canonical = Array.from(canonicalizeSignedLe(Uint8Array.from(out)));
  return Uint8Array.from(canonical);
}

export function smallQuotientDigit(current: bigint, divisor: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let u8!: bigint;
  let digit!: bigint;
  let rest!: bigint;
  let bit!: bigint;
  let done!: boolean;
  let step!: bigint;
  let fits!: boolean;
  let place!: bigint;
  u0 = 0n;
  u1 = 1n;
  u8 = 8n;
  digit = u0;
  rest = current;
  bit = u8;
  for (;;) {
    done = (bit === u0);
    if (done) {
      break;
    }
    bit = ((bit - u1) & MASK);
    step = ((divisor << bit) & MASK);
    fits = (rest >= step);
    if (fits) {
      rest = ((rest - step) & MASK);
      place = ((u1 << bit) & MASK);
      digit = (digit | place);
    }
  }
  return digit;
}

export function positiveDivSmallLe(value_raw: Uint8Array, divisor: bigint): Uint8Array {
  let value!: number[];
  let n!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u8!: bigint;
  let high_first!: number[];
  let remainder!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let shifted!: bigint;
  let current!: bigint;
  let digit!: bigint;
  let taken!: bigint;
  let out!: number[];
  let canonical!: number[];
  value = Array.from(signedAbsLe(value_raw));
  n = blen(value);
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u8 = 8n;
  high_first = [];
  remainder = u0;
  pos = n;
  for (;;) {
    done = (pos === i0);
    if (done) {
      break;
    }
    pos = (pos - i1);
    byte_ = bget(value, pos);
    shifted = ((remainder << u8) & MASK);
    current = ((shifted + byte_) & MASK);
    digit = smallQuotientDigit(current, divisor);
    high_first.push(Number(digit & 0xffn));
    taken = ((digit * divisor) & MASK);
    remainder = ((current - taken) & MASK);
  }
  out = [];
  pos = n;
  for (;;) {
    done = (pos === i0);
    if (done) {
      break;
    }
    pos = (pos - i1);
    byte_ = bget(high_first, pos);
    out.push(Number(byte_ & 0xffn));
  }
  out.push(Number(u0 & 0xffn));
  canonical = Array.from(canonicalizeSignedLe(Uint8Array.from(out)));
  return Uint8Array.from(canonical);
}

export function positiveRemSmallLe(value_raw: Uint8Array, divisor: bigint): bigint {
  let value!: number[];
  let n!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u8!: bigint;
  let remainder!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let shifted!: bigint;
  let current!: bigint;
  let digit!: bigint;
  let taken!: bigint;
  value = Array.from(signedAbsLe(value_raw));
  n = blen(value);
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u8 = 8n;
  remainder = u0;
  pos = n;
  for (;;) {
    done = (pos === i0);
    if (done) {
      break;
    }
    pos = (pos - i1);
    byte_ = bget(value, pos);
    shifted = ((remainder << u8) & MASK);
    current = ((shifted + byte_) & MASK);
    digit = smallQuotientDigit(current, divisor);
    taken = ((digit * divisor) & MASK);
    remainder = ((current - taken) & MASK);
  }
  return remainder;
}

export function signedCompareLe(left_raw: Uint8Array, right_raw: Uint8Array): bigint {
  let left!: number[];
  let right!: number[];
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u128!: bigint;
  let negative_one!: bigint;
  let left_n!: bigint;
  let right_n!: bigint;
  let left_last_pos!: bigint;
  let right_last_pos!: bigint;
  let left_last!: bigint;
  let right_last!: bigint;
  let left_sign!: bigint;
  let right_sign!: bigint;
  let left_negative!: boolean;
  let right_negative!: boolean;
  let right_positive!: boolean;
  let left_only_negative!: boolean;
  let left_positive!: boolean;
  let right_only_negative!: boolean;
  let left_shorter!: boolean;
  let short_result!: bigint;
  let left_longer!: boolean;
  let long_result!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let left_byte!: bigint;
  let right_byte!: bigint;
  let byte_less!: boolean;
  let byte_greater!: boolean;
  left = Array.from(canonicalizeSignedLe(left_raw));
  right = Array.from(canonicalizeSignedLe(right_raw));
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u128 = 128n;
  negative_one = (i0 - i1);
  left_n = blen(left);
  right_n = blen(right);
  left_last_pos = (left_n - i1);
  right_last_pos = (right_n - i1);
  left_last = bget(left, left_last_pos);
  right_last = bget(right, right_last_pos);
  left_sign = (left_last & u128);
  right_sign = (right_last & u128);
  left_negative = (left_sign !== u0);
  right_negative = (right_sign !== u0);
  right_positive = (!right_negative);
  left_only_negative = (left_negative && right_positive);
  if (left_only_negative) {
    return negative_one;
  }
  left_positive = (!left_negative);
  right_only_negative = (left_positive && right_negative);
  if (right_only_negative) {
    return i1;
  }
  left_shorter = (left_n < right_n);
  if (left_shorter) {
    short_result = negative_one;
    if (left_negative) {
      short_result = i1;
    }
    return short_result;
  }
  left_longer = (left_n > right_n);
  if (left_longer) {
    long_result = i1;
    if (left_negative) {
      long_result = negative_one;
    }
    return long_result;
  }
  pos = left_n;
  for (;;) {
    done = (pos === i0);
    if (done) {
      break;
    }
    pos = (pos - i1);
    left_byte = bget(left, pos);
    right_byte = bget(right, pos);
    byte_less = (left_byte < right_byte);
    if (byte_less) {
      return negative_one;
    }
    byte_greater = (left_byte > right_byte);
    if (byte_greater) {
      return i1;
    }
  }
  return i0;
}

export function bigintZero(): Uint8Array {
  let out!: number[];
  let zero!: bigint;
  out = [];
  zero = 0n;
  out.push(Number(zero & 0xffn));
  return Uint8Array.from(out);
}

export function bigintOne(): Uint8Array {
  let out!: number[];
  let one!: bigint;
  out = [];
  one = 1n;
  out.push(Number(one & 0xffn));
  return Uint8Array.from(out);
}

export function bigintTwo(): Uint8Array {
  let out!: number[];
  let two!: bigint;
  out = [];
  two = 2n;
  out.push(Number(two & 0xffn));
  return Uint8Array.from(out);
}

export function bigintBase256(): Uint8Array {
  let out!: number[];
  let zero!: bigint;
  let one!: bigint;
  out = [];
  zero = 0n;
  one = 1n;
  out.push(Number(zero & 0xffn));
  out.push(Number(one & 0xffn));
  return Uint8Array.from(out);
}

export function positiveU8Le(value: bigint): Uint8Array {
  let out!: number[];
  let u0!: bigint;
  let u128!: bigint;
  let needs_sign_byte!: boolean;
  out = [];
  u0 = 0n;
  u128 = 128n;
  out.push(Number(value & 0xffn));
  needs_sign_byte = (value >= u128);
  if (needs_sign_byte) {
    out.push(Number(u0 & 0xffn));
  }
  return Uint8Array.from(out);
}

export function bigintMin(left: Uint8Array, right: Uint8Array): Uint8Array {
  let cmp!: bigint;
  let i0!: bigint;
  let left_is_min!: boolean;
  let out_left!: number[];
  let out_right!: number[];
  cmp = signedCompareLe(left, right);
  i0 = 0n;
  left_is_min = (cmp <= i0);
  if (left_is_min) {
    out_left = Array.from(canonicalizeSignedLe(left));
    return Uint8Array.from(out_left);
  }
  out_right = Array.from(canonicalizeSignedLe(right));
  return Uint8Array.from(out_right);
}

export function integerSimplest(min_value: Uint8Array, max_value: Uint8Array, shrink_towards: Uint8Array): Uint8Array {
  let i0!: bigint;
  let below_cmp!: bigint;
  let below!: boolean;
  let min_out!: number[];
  let above_cmp!: bigint;
  let above!: boolean;
  let max_out!: number[];
  let target_out!: number[];
  i0 = 0n;
  below_cmp = signedCompareLe(shrink_towards, min_value);
  below = (below_cmp < i0);
  if (below) {
    min_out = Array.from(canonicalizeSignedLe(min_value));
    return Uint8Array.from(min_out);
  }
  above_cmp = signedCompareLe(shrink_towards, max_value);
  above = (above_cmp > i0);
  if (above) {
    max_out = Array.from(canonicalizeSignedLe(max_value));
    return Uint8Array.from(max_out);
  }
  target_out = Array.from(canonicalizeSignedLe(shrink_towards));
  return Uint8Array.from(target_out);
}

export function integerValidate(min_value: Uint8Array, max_value: Uint8Array, value: Uint8Array): boolean {
  let i0!: bigint;
  let min_cmp!: bigint;
  let max_cmp!: bigint;
  let above_min!: boolean;
  let below_max!: boolean;
  let valid!: boolean;
  i0 = 0n;
  min_cmp = signedCompareLe(min_value, value);
  max_cmp = signedCompareLe(value, max_value);
  above_min = (min_cmp <= i0);
  below_max = (max_cmp <= i0);
  valid = (above_min && below_max);
  return valid;
}

export function integerUnit(min_value: Uint8Array, max_value: Uint8Array, shrink_towards: Uint8Array): Uint8Array {
  let simplest!: number[];
  let one!: number[];
  let successor!: number[];
  let successor_valid!: boolean;
  let predecessor!: number[];
  let predecessor_valid!: boolean;
  simplest = Array.from(integerSimplest(min_value, max_value, shrink_towards));
  one = Array.from(bigintOne());
  successor = Array.from(signedAddLe(Uint8Array.from(simplest), Uint8Array.from(one)));
  successor_valid = integerValidate(min_value, max_value, Uint8Array.from(successor));
  if (successor_valid) {
    return Uint8Array.from(successor);
  }
  predecessor = Array.from(signedSubLe(Uint8Array.from(simplest), Uint8Array.from(one)));
  predecessor_valid = integerValidate(min_value, max_value, Uint8Array.from(predecessor));
  if (predecessor_valid) {
    return Uint8Array.from(predecessor);
  }
  return Uint8Array.from(simplest);
}

export function integerMaxIndex(min_value: Uint8Array, max_value: Uint8Array): Uint8Array {
  let difference!: number[];
  let out!: number[];
  difference = Array.from(signedSubLe(max_value, min_value));
  out = Array.from(signedAbsLe(Uint8Array.from(difference)));
  return Uint8Array.from(out);
}

export function integerToIndex(min_value: Uint8Array, max_value: Uint8Array, shrink_towards: Uint8Array, value: Uint8Array): Uint8Array {
  let i0!: bigint;
  let simplest!: number[];
  let value_cmp!: bigint;
  let at_simplest!: boolean;
  let zero!: number[];
  let above_delta!: number[];
  let above!: number[];
  let below_delta!: number[];
  let below!: number[];
  let value_delta!: number[];
  let distance!: number[];
  let one!: number[];
  let distance_minus_one!: number[];
  let count_above!: number[];
  let count_below!: number[];
  let count!: number[];
  let value_above!: boolean;
  let up_index!: number[];
  let distance_cmp!: bigint;
  let up_slot_exists!: boolean;
  let down_index!: number[];
  i0 = 0n;
  simplest = Array.from(integerSimplest(min_value, max_value, shrink_towards));
  value_cmp = signedCompareLe(value, Uint8Array.from(simplest));
  at_simplest = (value_cmp === i0);
  if (at_simplest) {
    zero = Array.from(bigintZero());
    return Uint8Array.from(zero);
  }
  above_delta = Array.from(signedSubLe(max_value, Uint8Array.from(simplest)));
  above = Array.from(signedAbsLe(Uint8Array.from(above_delta)));
  below_delta = Array.from(signedSubLe(Uint8Array.from(simplest), min_value));
  below = Array.from(signedAbsLe(Uint8Array.from(below_delta)));
  value_delta = Array.from(signedSubLe(value, Uint8Array.from(simplest)));
  distance = Array.from(signedAbsLe(Uint8Array.from(value_delta)));
  one = Array.from(bigintOne());
  distance_minus_one = Array.from(signedSubLe(Uint8Array.from(distance), Uint8Array.from(one)));
  count_above = Array.from(bigintMin(Uint8Array.from(distance_minus_one), Uint8Array.from(above)));
  count_below = Array.from(bigintMin(Uint8Array.from(distance_minus_one), Uint8Array.from(below)));
  count = Array.from(signedAddLe(Uint8Array.from(count_above), Uint8Array.from(count_below)));
  value_above = (value_cmp > i0);
  if (value_above) {
    up_index = Array.from(signedAddLe(Uint8Array.from(count), Uint8Array.from(one)));
    return Uint8Array.from(up_index);
  }
  distance_cmp = signedCompareLe(Uint8Array.from(distance), Uint8Array.from(above));
  up_slot_exists = (distance_cmp <= i0);
  if (up_slot_exists) {
    count = Array.from(signedAddLe(Uint8Array.from(count), Uint8Array.from(one)));
  }
  down_index = Array.from(signedAddLe(Uint8Array.from(count), Uint8Array.from(one)));
  return Uint8Array.from(down_index);
}

export function integerFromIndex(min_value: Uint8Array, max_value: Uint8Array, shrink_towards: Uint8Array, index_raw: Uint8Array): Uint8Array | null {
  let i0!: bigint;
  let simplest!: number[];
  let index!: number[];
  let zero!: number[];
  let index_zero_cmp!: bigint;
  let at_zero!: boolean;
  let some_simplest!: Uint8Array | null;
  let above_delta!: number[];
  let above!: number[];
  let below_delta!: number[];
  let below!: number[];
  let max_index!: number[];
  let past_cmp!: bigint;
  let past_end!: boolean;
  let none!: Uint8Array | null;
  let a!: number[];
  let two_a!: number[];
  let two_a_cmp!: bigint;
  let interleaved!: boolean;
  let distance!: number[];
  let up!: boolean;
  let one!: number[];
  let two!: number[];
  let index_plus_one!: number[];
  let parity!: number[];
  let parity_cmp!: bigint;
  let tail!: boolean;
  let range_cmp!: bigint;
  let result!: number[];
  let some!: Uint8Array | null;
  i0 = 0n;
  simplest = Array.from(integerSimplest(min_value, max_value, shrink_towards));
  index = Array.from(signedAbsLe(index_raw));
  zero = Array.from(bigintZero());
  index_zero_cmp = signedCompareLe(Uint8Array.from(index), Uint8Array.from(zero));
  at_zero = (index_zero_cmp === i0);
  if (at_zero) {
    some_simplest = Uint8Array.from(simplest);
    return some_simplest;
  }
  above_delta = Array.from(signedSubLe(max_value, Uint8Array.from(simplest)));
  above = Array.from(signedAbsLe(Uint8Array.from(above_delta)));
  below_delta = Array.from(signedSubLe(Uint8Array.from(simplest), min_value));
  below = Array.from(signedAbsLe(Uint8Array.from(below_delta)));
  max_index = Array.from(signedAddLe(Uint8Array.from(above), Uint8Array.from(below)));
  past_cmp = signedCompareLe(Uint8Array.from(index), Uint8Array.from(max_index));
  past_end = (past_cmp > i0);
  if (past_end) {
    none = null;
    return none;
  }
  a = Array.from(bigintMin(Uint8Array.from(above), Uint8Array.from(below)));
  two_a = Array.from(signedAddLe(Uint8Array.from(a), Uint8Array.from(a)));
  two_a_cmp = signedCompareLe(Uint8Array.from(index), Uint8Array.from(two_a));
  interleaved = (two_a_cmp <= i0);
  distance = index.slice();
  up = false;
  if (interleaved) {
    one = Array.from(bigintOne());
    two = Array.from(bigintTwo());
    index_plus_one = Array.from(signedAddLe(Uint8Array.from(index), Uint8Array.from(one)));
    distance = Array.from(positiveDivLeNonzero(Uint8Array.from(index_plus_one), Uint8Array.from(two)));
    parity = Array.from(positiveRemLeNonzero(Uint8Array.from(index), Uint8Array.from(two)));
    parity_cmp = signedCompareLe(Uint8Array.from(parity), Uint8Array.from(zero));
    up = (parity_cmp !== i0);
  }
  tail = (!interleaved);
  if (tail) {
    distance = Array.from(signedSubLe(Uint8Array.from(index), Uint8Array.from(a)));
    range_cmp = signedCompareLe(Uint8Array.from(above), Uint8Array.from(below));
    up = (range_cmp > i0);
  }
  result = Array.from(signedSubLe(Uint8Array.from(simplest), Uint8Array.from(distance)));
  if (up) {
    result = Array.from(signedAddLe(Uint8Array.from(simplest), Uint8Array.from(distance)));
  }
  some = Uint8Array.from(result);
  return some;
}

export function integerShrinkExtraDivisor(slot: bigint): Uint8Array {
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u5!: bigint;
  let u7!: bigint;
  let u10!: bigint;
  let divisor!: bigint;
  let is_three!: boolean;
  let is_five!: boolean;
  let is_seven!: boolean;
  let out!: number[];
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u5 = 5n;
  u7 = 7n;
  u10 = 10n;
  divisor = u10;
  is_three = (slot === u0);
  if (is_three) {
    divisor = u3;
  }
  is_five = (slot === u1);
  if (is_five) {
    divisor = u5;
  }
  is_seven = (slot === u2);
  if (is_seven) {
    divisor = u7;
  }
  out = Array.from(positiveU8Le(divisor));
  return Uint8Array.from(out);
}

export function integerTrailingPower(distance: Uint8Array, radix: bigint): Uint8Array {
  let i0!: bigint;
  let base!: number[];
  let zero!: number[];
  let power!: number[];
  let rest!: number[];
  let rest_cmp!: bigint;
  let exhausted!: boolean;
  let remainder!: number[];
  let remainder_cmp!: bigint;
  let divides!: boolean;
  let stops!: boolean;
  i0 = 0n;
  base = Array.from(positiveU8Le(radix));
  zero = Array.from(bigintZero());
  power = Array.from(bigintOne());
  rest = Array.from(signedAbsLe(distance));
  for (;;) {
    rest_cmp = signedCompareLe(Uint8Array.from(rest), Uint8Array.from(zero));
    exhausted = (rest_cmp === i0);
    if (exhausted) {
      break;
    }
    remainder = Array.from(positiveRemLeNonzero(Uint8Array.from(rest), Uint8Array.from(base)));
    remainder_cmp = signedCompareLe(Uint8Array.from(remainder), Uint8Array.from(zero));
    divides = (remainder_cmp === i0);
    stops = (!divides);
    if (stops) {
      break;
    }
    rest = Array.from(positiveDivLeNonzero(Uint8Array.from(rest), Uint8Array.from(base)));
    power = Array.from(signedMulLe(Uint8Array.from(power), Uint8Array.from(base)));
  }
  return Uint8Array.from(power);
}

export function integerShrinkExtraDistance(distance: Uint8Array, slot: bigint): Uint8Array {
  let i0!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u4!: bigint;
  let u10!: bigint;
  let zero!: number[];
  let one!: number[];
  let divides!: boolean;
  let divisor!: number[];
  let quotient!: number[];
  let radix!: bigint;
  let decimal!: boolean;
  let power!: number[];
  let one_cmp!: bigint;
  let trivial!: boolean;
  let whole_cmp!: bigint;
  let whole!: boolean;
  let earlier!: bigint;
  let checked!: boolean;
  let earlier_divisor!: number[];
  let earlier_quotient!: number[];
  let same_cmp!: bigint;
  let same!: boolean;
  i0 = 0n;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u4 = 4n;
  u10 = 10n;
  zero = Array.from(bigintZero());
  one = Array.from(bigintOne());
  divides = (slot < u4);
  if (divides) {
    divisor = Array.from(integerShrinkExtraDivisor(slot));
    quotient = Array.from(positiveDivLeNonzero(distance, Uint8Array.from(divisor)));
    return Uint8Array.from(quotient);
  }
  radix = u2;
  decimal = (slot === u4);
  if (decimal) {
    radix = u10;
  }
  power = Array.from(integerTrailingPower(distance, radix));
  one_cmp = signedCompareLe(Uint8Array.from(power), Uint8Array.from(one));
  trivial = (one_cmp <= i0);
  if (trivial) {
    return Uint8Array.from(zero);
  }
  whole_cmp = signedCompareLe(Uint8Array.from(power), distance);
  whole = (whole_cmp >= i0);
  if (whole) {
    return Uint8Array.from(zero);
  }
  earlier = u0;
  for (;;) {
    checked = (earlier >= u4);
    if (checked) {
      break;
    }
    earlier_divisor = Array.from(integerShrinkExtraDivisor(earlier));
    earlier_quotient = Array.from(positiveDivLeNonzero(distance, Uint8Array.from(earlier_divisor)));
    same_cmp = signedCompareLe(Uint8Array.from(power), Uint8Array.from(earlier_quotient));
    same = (same_cmp === i0);
    if (same) {
      return Uint8Array.from(zero);
    }
    earlier = ((earlier + u1) & MASK);
  }
  return Uint8Array.from(power);
}

export function integerShrinkExtra(min_value: Uint8Array, max_value: Uint8Array, shrink_towards: Uint8Array, value: Uint8Array, ordinal: bigint): Uint8Array | null {
  let i0!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u5!: bigint;
  let u6!: bigint;
  let zero!: number[];
  let prefix!: number[];
  let simplest!: number[];
  let offset!: number[];
  let distance!: number[];
  let seen!: bigint;
  let slot!: bigint;
  let slots_done!: boolean;
  let moved!: number[];
  let moved_cmp!: bigint;
  let moves!: boolean;
  let side!: bigint;
  let sides_done!: boolean;
  let candidate!: number[];
  let below!: boolean;
  let valid!: boolean;
  let index!: number[];
  let index_cmp!: bigint;
  let unprobed!: boolean;
  let wanted!: boolean;
  let some!: Uint8Array | null;
  let none!: Uint8Array | null;
  i0 = 0n;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u5 = 5n;
  u6 = 6n;
  zero = Array.from(bigintZero());
  prefix = Array.from(positiveU8Le(u5));
  simplest = Array.from(integerSimplest(min_value, max_value, shrink_towards));
  offset = Array.from(signedSubLe(value, Uint8Array.from(simplest)));
  distance = Array.from(signedAbsLe(Uint8Array.from(offset)));
  seen = u0;
  slot = u0;
  for (;;) {
    slots_done = (slot >= u6);
    if (slots_done) {
      break;
    }
    moved = Array.from(integerShrinkExtraDistance(Uint8Array.from(distance), slot));
    moved_cmp = signedCompareLe(Uint8Array.from(moved), Uint8Array.from(zero));
    moves = (moved_cmp > i0);
    if (moves) {
      side = u0;
      for (;;) {
        sides_done = (side >= u2);
        if (sides_done) {
          break;
        }
        candidate = Array.from(signedAddLe(Uint8Array.from(simplest), Uint8Array.from(moved)));
        below = (side === u1);
        if (below) {
          candidate = Array.from(signedSubLe(Uint8Array.from(simplest), Uint8Array.from(moved)));
        }
        valid = integerValidate(min_value, max_value, Uint8Array.from(candidate));
        if (valid) {
          index = Array.from(integerToIndex(min_value, max_value, shrink_towards, Uint8Array.from(candidate)));
          index_cmp = signedCompareLe(Uint8Array.from(index), Uint8Array.from(prefix));
          unprobed = (index_cmp >= i0);
          if (unprobed) {
            wanted = (seen === ordinal);
            if (wanted) {
              some = Uint8Array.from(candidate);
              return some;
            }
            seen = ((seen + u1) & MASK);
          }
        }
        side = ((side + u1) & MASK);
      }
    }
    slot = ((slot + u1) & MASK);
  }
  none = null;
  return none;
}

export function booleanMaxIndex(): Uint8Array {
  let one!: number[];
  one = Array.from(bigintOne());
  return Uint8Array.from(one);
}

export function booleanToIndex(value: boolean): Uint8Array {
  let one!: number[];
  let zero!: number[];
  if (value) {
    one = Array.from(bigintOne());
    return Uint8Array.from(one);
  }
  zero = Array.from(bigintZero());
  return Uint8Array.from(zero);
}

export function booleanFromIndex(index: Uint8Array): boolean | null {
  let i0!: bigint;
  let zero!: number[];
  let zero_cmp!: bigint;
  let is_zero!: boolean;
  let false_!: boolean;
  let some_false!: boolean | null;
  let one!: number[];
  let one_cmp!: bigint;
  let is_one!: boolean;
  let true_!: boolean;
  let some_true!: boolean | null;
  let none!: boolean | null;
  i0 = 0n;
  zero = Array.from(bigintZero());
  zero_cmp = signedCompareLe(index, Uint8Array.from(zero));
  is_zero = (zero_cmp === i0);
  if (is_zero) {
    false_ = false;
    some_false = false_;
    return some_false;
  }
  one = Array.from(bigintOne());
  one_cmp = signedCompareLe(index, Uint8Array.from(one));
  is_one = (one_cmp === i0);
  if (is_one) {
    true_ = true;
    some_true = true_;
    return some_true;
  }
  none = null;
  return none;
}

export function bytesSimplest(min_size: bigint): Uint8Array {
  let out!: number[];
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let pos!: bigint;
  let done!: boolean;
  out = [];
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  pos = i0;
  for (;;) {
    done = (pos >= min_size);
    if (done) {
      break;
    }
    out.push(Number(u0 & 0xffn));
    pos = (pos + i1);
  }
  return Uint8Array.from(out);
}

export function bytesUnit(min_size: bigint, max_size: bigint): Uint8Array {
  let out!: number[];
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let has_minimum!: boolean;
  let last_pos!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let is_last!: boolean;
  let byte_!: bigint;
  let has_values!: boolean;
  out = [];
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  has_minimum = (min_size > i0);
  if (has_minimum) {
    last_pos = (min_size - i1);
    pos = i0;
    for (;;) {
      done = (pos >= min_size);
      if (done) {
        break;
      }
      is_last = (pos === last_pos);
      byte_ = u0;
      if (is_last) {
        byte_ = u1;
      }
      out.push(Number(byte_ & 0xffn));
      pos = (pos + i1);
    }
    return Uint8Array.from(out);
  }
  has_values = (max_size > i0);
  if (has_values) {
    out.push(Number(u1 & 0xffn));
  }
  return Uint8Array.from(out);
}

export function bytesValidate(min_size: bigint, max_size: bigint, value: Uint8Array): boolean {
  let length!: bigint;
  let above_min!: boolean;
  let below_max!: boolean;
  let valid!: boolean;
  length = blen(value);
  above_min = (length >= min_size);
  below_max = (length <= max_size);
  valid = (above_min && below_max);
  return valid;
}

export function bytesToIndex(min_size: bigint, value: Uint8Array): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let value_length!: bigint;
  let last!: bigint;
  let out!: number[];
  let carry!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let mirror!: bigint;
  let digit!: bigint;
  let sum!: bigint;
  let in_offset!: boolean;
  let out_byte!: bigint;
  let index!: number[];
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  u8 = 8n;
  u255 = 255n;
  value_length = blen(value);
  last = (value_length - i1);
  out = [];
  carry = u0;
  pos = i0;
  for (;;) {
    done = (pos >= value_length);
    if (done) {
      break;
    }
    mirror = (last - pos);
    digit = bget(value, mirror);
    sum = ((digit + carry) & MASK);
    in_offset = (pos >= min_size);
    if (in_offset) {
      sum = ((sum + u1) & MASK);
    }
    out_byte = (sum & u255);
    out.push(Number(out_byte & 0xffn));
    carry = (sum >> u8);
    pos = (pos + i1);
  }
  out.push(Number(carry & 0xffn));
  out.push(Number(u0 & 0xffn));
  index = Array.from(canonicalizeSignedLe(Uint8Array.from(out)));
  return Uint8Array.from(index);
}

export function bytesMaxIndex(min_size: bigint, max_size: bigint): Uint8Array {
  let last!: number[];
  let i0!: bigint;
  let i1!: bigint;
  let u255!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let index!: number[];
  last = [];
  i0 = 0n;
  i1 = 1n;
  u255 = 255n;
  pos = i0;
  for (;;) {
    done = (pos >= max_size);
    if (done) {
      break;
    }
    last.push(Number(u255 & 0xffn));
    pos = (pos + i1);
  }
  index = Array.from(bytesToIndex(min_size, Uint8Array.from(last)));
  return Uint8Array.from(index);
}

export function bytesFromIndex(min_size: bigint, max_size: bigint, index_raw: Uint8Array): Uint8Array | null {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let u256!: bigint;
  let index!: number[];
  let index_n!: bigint;
  let significant!: bigint;
  let none_left!: boolean;
  let top_pos!: bigint;
  let top!: bigint;
  let top_set!: boolean;
  let length!: bigint;
  let past_min!: boolean;
  let pos!: bigint;
  let done!: boolean;
  let index_byte!: bigint;
  let offset_byte!: bigint;
  let in_offset!: boolean;
  let below!: boolean;
  let above!: boolean;
  let past_end!: boolean;
  let none!: Uint8Array | null;
  let low_first!: number[];
  let borrow!: bigint;
  let present!: boolean;
  let subtrahend!: bigint;
  let lifted!: bigint;
  let difference!: bigint;
  let out_byte!: bigint;
  let kept!: bigint;
  let out!: number[];
  let byte_!: bigint;
  let some!: Uint8Array | null;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  u8 = 8n;
  u255 = 255n;
  u256 = 256n;
  index = Array.from(signedAbsLe(index_raw));
  index_n = blen(index);
  significant = index_n;
  for (;;) {
    none_left = (significant === i0);
    if (none_left) {
      break;
    }
    top_pos = (significant - i1);
    top = bget(index, top_pos);
    top_set = (top !== u0);
    if (top_set) {
      break;
    }
    significant = top_pos;
  }
  length = min_size;
  past_min = (significant > min_size);
  if (past_min) {
    length = significant;
    pos = significant;
    for (;;) {
      done = (pos === i0);
      if (done) {
        break;
      }
      pos = (pos - i1);
      index_byte = bget(index, pos);
      offset_byte = u0;
      in_offset = (pos >= min_size);
      if (in_offset) {
        offset_byte = u1;
      }
      below = (index_byte < offset_byte);
      if (below) {
        length = (significant - i1);
        break;
      }
      above = (index_byte > offset_byte);
      if (above) {
        break;
      }
    }
  }
  past_end = (length > max_size);
  if (past_end) {
    none = null;
    return none;
  }
  low_first = [];
  borrow = u0;
  pos = i0;
  for (;;) {
    done = (pos >= length);
    if (done) {
      break;
    }
    index_byte = u0;
    present = (pos < index_n);
    if (present) {
      index_byte = bget(index, pos);
    }
    subtrahend = borrow;
    in_offset = (pos >= min_size);
    if (in_offset) {
      subtrahend = ((subtrahend + u1) & MASK);
    }
    lifted = ((index_byte + u256) & MASK);
    difference = ((lifted - subtrahend) & MASK);
    out_byte = (difference & u255);
    low_first.push(Number(out_byte & 0xffn));
    kept = (difference >> u8);
    borrow = ((u1 - kept) & MASK);
    pos = (pos + i1);
  }
  out = [];
  pos = length;
  for (;;) {
    done = (pos === i0);
    if (done) {
      break;
    }
    pos = (pos - i1);
    byte_ = bget(low_first, pos);
    out.push(Number(byte_ & 0xffn));
  }
  some = Uint8Array.from(out);
  return some;
}

export function f64Abs(value: number): number {
  let mask!: bigint;
  let bits!: bigint;
  let cleared!: bigint;
  let out!: number;
  mask = 9223372036854775807n;
  bits = f2bits(value);
  cleared = (bits & mask);
  out = bits2f(cleared);
  return out;
}

export function f64Neg(value: number): number {
  let mask!: bigint;
  let bits!: bigint;
  let flipped!: bigint;
  let out!: number;
  mask = 9223372036854775808n;
  bits = f2bits(value);
  flipped = (bits ^ mask);
  out = bits2f(flipped);
  return out;
}

export function f64Infinity(): number {
  let bits!: bigint;
  let out!: number;
  bits = 9218868437227405312n;
  out = bits2f(bits);
  return out;
}

export function f64NegInfinity(): number {
  let positive!: number;
  let out!: number;
  positive = f64Infinity();
  out = f64Neg(positive);
  return out;
}

export function f64Nan(): number {
  let bits!: bigint;
  let out!: number;
  bits = 9221120237041090560n;
  out = bits2f(bits);
  return out;
}

export function f64Max(): number {
  let bits!: bigint;
  let out!: number;
  bits = 9218868437227405311n;
  out = bits2f(bits);
  return out;
}

export function signAwareLte(left: number, right: number): boolean {
  let zero!: number;
  let left_zero!: boolean;
  let right_zero!: boolean;
  let both_zero!: boolean;
  let left_negative!: boolean;
  let right_negative!: boolean;
  let left_positive!: boolean;
  let only_right_negative!: boolean;
  let ordered!: boolean;
  zero = 0;
  left_zero = (left === zero);
  right_zero = (right === zero);
  both_zero = (left_zero && right_zero);
  if (both_zero) {
    left_negative = signbit(left);
    right_negative = signbit(right);
    left_positive = (!left_negative);
    only_right_negative = (left_positive && right_negative);
    ordered = (!only_right_negative);
    return ordered;
  }
  ordered = (left <= right);
  return ordered;
}

export function floatValidate(min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number, value: number): boolean {
  let false_!: boolean;
  let true_!: boolean;
  let is_nan!: boolean;
  let is_infinite!: boolean;
  let no_infinity!: boolean;
  let negative_infinity!: number;
  let is_negative_infinity!: boolean;
  let min_bounded!: boolean;
  let reject_low!: boolean;
  let positive_infinity!: number;
  let is_positive_infinity!: boolean;
  let max_bounded!: boolean;
  let reject_high!: boolean;
  let zero!: number;
  let nonzero!: boolean;
  let magnitude!: number;
  let below_smallest!: boolean;
  let reject_tiny!: boolean;
  let above_min!: boolean;
  let below_max!: boolean;
  let valid!: boolean;
  false_ = false;
  true_ = true;
  is_nan = Number.isNaN(value);
  if (is_nan) {
    return allow_nan;
  }
  is_infinite = isInf(value);
  if (is_infinite) {
    no_infinity = (!allow_infinity);
    if (no_infinity) {
      return false_;
    }
    negative_infinity = f64NegInfinity();
    is_negative_infinity = (value === negative_infinity);
    min_bounded = (min_value > negative_infinity);
    reject_low = (is_negative_infinity && min_bounded);
    if (reject_low) {
      return false_;
    }
    positive_infinity = f64Infinity();
    is_positive_infinity = (value === positive_infinity);
    max_bounded = (max_value < positive_infinity);
    reject_high = (is_positive_infinity && max_bounded);
    if (reject_high) {
      return false_;
    }
    return true_;
  }
  zero = 0;
  nonzero = (value !== zero);
  magnitude = f64Abs(value);
  below_smallest = (magnitude < smallest_nonzero);
  reject_tiny = (nonzero && below_smallest);
  if (reject_tiny) {
    return false_;
  }
  above_min = signAwareLte(min_value, value);
  below_max = signAwareLte(value, max_value);
  valid = (above_min && below_max);
  return valid;
}

export function floatSimplest(min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number): number | null {
  let zero!: number;
  let zero_ok!: boolean;
  let found!: number | null;
  let negative_zero!: number;
  let negative_zero_ok!: boolean;
  let has_best!: boolean;
  let best_index!: bigint;
  let best_value!: number;
  let largest!: number;
  let max_positive!: boolean;
  let low!: number;
  let min_below_smallest!: boolean;
  let high!: number;
  let max_above_largest!: boolean;
  let ordered!: boolean;
  let candidate!: number;
  let index!: bigint;
  let min_negative!: boolean;
  let mirrored_low!: number;
  let mirror_below_smallest!: boolean;
  let mirrored_high!: number;
  let mirror_above_largest!: boolean;
  let no_best!: boolean;
  let strictly_lower!: boolean;
  let take!: boolean;
  let negated!: number;
  let positive_infinity!: number;
  let positive_ok!: boolean;
  let negative_infinity!: number;
  let negative_ok!: boolean;
  let not_a_number!: number;
  let missing!: number | null;
  zero = 0;
  zero_ok = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, zero);
  if (zero_ok) {
    found = zero;
    return found;
  }
  negative_zero = f64Neg(zero);
  negative_zero_ok = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, negative_zero);
  if (negative_zero_ok) {
    found = negative_zero;
    return found;
  }
  has_best = false;
  best_index = 0n;
  best_value = zero;
  largest = f64Max();
  max_positive = (max_value > zero);
  if (max_positive) {
    low = min_value;
    min_below_smallest = (min_value < smallest_nonzero);
    if (min_below_smallest) {
      low = smallest_nonzero;
    }
    high = max_value;
    max_above_largest = (max_value > largest);
    if (max_above_largest) {
      high = largest;
    }
    ordered = (low <= high);
    if (ordered) {
      candidate = simplestInRange(low, high);
      index = floatToIndex(candidate);
      has_best = true;
      best_index = index;
      best_value = candidate;
    }
  }
  min_negative = (min_value < zero);
  if (min_negative) {
    mirrored_low = f64Neg(max_value);
    low = mirrored_low;
    mirror_below_smallest = (mirrored_low < smallest_nonzero);
    if (mirror_below_smallest) {
      low = smallest_nonzero;
    }
    mirrored_high = f64Neg(min_value);
    high = mirrored_high;
    mirror_above_largest = (mirrored_high > largest);
    if (mirror_above_largest) {
      high = largest;
    }
    ordered = (low <= high);
    if (ordered) {
      candidate = simplestInRange(low, high);
      index = floatToIndex(candidate);
      no_best = (!has_best);
      strictly_lower = (index < best_index);
      take = (no_best || strictly_lower);
      if (take) {
        negated = f64Neg(candidate);
        has_best = true;
        best_index = index;
        best_value = negated;
      }
    }
  }
  if (has_best) {
    found = best_value;
    return found;
  }
  if (allow_infinity) {
    positive_infinity = f64Infinity();
    positive_ok = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, positive_infinity);
    if (positive_ok) {
      found = positive_infinity;
      return found;
    }
    negative_infinity = f64NegInfinity();
    negative_ok = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, negative_infinity);
    if (negative_ok) {
      found = negative_infinity;
      return found;
    }
  }
  if (allow_nan) {
    not_a_number = f64Nan();
    found = not_a_number;
    return found;
  }
  missing = null;
  return missing;
}

export function floatUnit(min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number): number | null {
  let simplest_opt!: number | null;
  let present!: boolean;
  let absent!: boolean;
  let missing!: number | null;
  let simplest!: number;
  let simplest_is_nan!: boolean;
  let found!: number | null;
  let u1!: bigint;
  let u4!: bigint;
  let magnitude!: number;
  let base!: bigint;
  let offset!: bigint;
  let exhausted!: boolean;
  let index!: bigint;
  let positive!: number;
  let positive_is_nan!: boolean;
  let positive_finite!: boolean;
  let positive_ok!: boolean;
  let take_positive!: boolean;
  let negative!: number;
  let negative_is_nan!: boolean;
  let negative_finite!: boolean;
  let negative_ok!: boolean;
  let take_negative!: boolean;
  let simplest_bits!: bigint;
  let min_is_nan!: boolean;
  let min_finite!: boolean;
  let min_bits!: bigint;
  let min_distinct!: boolean;
  let min_ok!: boolean;
  let min_usable!: boolean;
  let take_min!: boolean;
  let max_is_nan!: boolean;
  let max_finite!: boolean;
  let max_bits!: bigint;
  let max_distinct!: boolean;
  let max_ok!: boolean;
  let max_usable!: boolean;
  let take_max!: boolean;
  let mirrored!: number;
  let mirrored_is_nan!: boolean;
  let mirrored_finite!: boolean;
  let mirrored_bits!: bigint;
  let mirrored_distinct!: boolean;
  let mirrored_ok!: boolean;
  let mirrored_usable!: boolean;
  let take_mirrored!: boolean;
  simplest_opt = floatSimplest(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero);
  present = (simplest_opt !== null);
  absent = (!present);
  if (absent) {
    missing = null;
    return missing;
  }
  simplest = simplest_opt!;
  simplest_is_nan = Number.isNaN(simplest);
  if (simplest_is_nan) {
    found = simplest;
    return found;
  }
  u1 = 1n;
  u4 = 4n;
  magnitude = f64Abs(simplest);
  base = floatToIndex(magnitude);
  offset = u1;
  for (;;) {
    exhausted = (offset >= u4);
    if (exhausted) {
      break;
    }
    index = ((base + offset) & MASK);
    positive = indexToFloat(index);
    positive_is_nan = Number.isNaN(positive);
    positive_finite = (!positive_is_nan);
    positive_ok = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, positive);
    take_positive = (positive_finite && positive_ok);
    if (take_positive) {
      found = positive;
      return found;
    }
    negative = f64Neg(positive);
    negative_is_nan = Number.isNaN(negative);
    negative_finite = (!negative_is_nan);
    negative_ok = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, negative);
    take_negative = (negative_finite && negative_ok);
    if (take_negative) {
      found = negative;
      return found;
    }
    offset = ((offset + u1) & MASK);
  }
  simplest_bits = f2bits(simplest);
  min_is_nan = Number.isNaN(min_value);
  min_finite = (!min_is_nan);
  min_bits = f2bits(min_value);
  min_distinct = (min_bits !== simplest_bits);
  min_ok = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, min_value);
  min_usable = (min_finite && min_distinct);
  take_min = (min_usable && min_ok);
  if (take_min) {
    found = min_value;
    return found;
  }
  max_is_nan = Number.isNaN(max_value);
  max_finite = (!max_is_nan);
  max_bits = f2bits(max_value);
  max_distinct = (max_bits !== simplest_bits);
  max_ok = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, max_value);
  max_usable = (max_finite && max_distinct);
  take_max = (max_usable && max_ok);
  if (take_max) {
    found = max_value;
    return found;
  }
  mirrored = f64Neg(simplest);
  mirrored_is_nan = Number.isNaN(mirrored);
  mirrored_finite = (!mirrored_is_nan);
  mirrored_bits = f2bits(mirrored);
  mirrored_distinct = (mirrored_bits !== simplest_bits);
  mirrored_ok = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, mirrored);
  mirrored_usable = (mirrored_finite && mirrored_distinct);
  take_mirrored = (mirrored_usable && mirrored_ok);
  if (take_mirrored) {
    found = mirrored;
    return found;
  }
  found = simplest;
  return found;
}

export function u64ToBigintLe(value: bigint): Uint8Array {
  let out!: number[];
  let i0!: bigint;
  let i1!: bigint;
  let i8!: bigint;
  let u0!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let shift!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let shifted!: bigint;
  let byte_!: bigint;
  let canonical!: number[];
  out = [];
  i0 = 0n;
  i1 = 1n;
  i8 = 8n;
  u0 = 0n;
  u8 = 8n;
  u255 = 255n;
  shift = u0;
  pos = i0;
  for (;;) {
    done = (pos >= i8);
    if (done) {
      break;
    }
    shifted = (value >> shift);
    byte_ = (shifted & u255);
    out.push(Number(byte_ & 0xffn));
    shift = ((shift + u8) & MASK);
    pos = (pos + i1);
  }
  out.push(Number(u0 & 0xffn));
  canonical = Array.from(canonicalizeSignedLe(Uint8Array.from(out)));
  return Uint8Array.from(canonical);
}

export function bigintToU64Le(value: Uint8Array): bigint | null {
  let canonical!: number[];
  let i0!: bigint;
  let i1!: bigint;
  let i8!: bigint;
  let i9!: bigint;
  let u0!: bigint;
  let u8!: bigint;
  let u128!: bigint;
  let length!: bigint;
  let last_pos!: bigint;
  let last!: bigint;
  let sign_bit!: bigint;
  let negative!: boolean;
  let none!: bigint | null;
  let too_wide!: boolean;
  let at_limit!: boolean;
  let top!: bigint;
  let magnitude_in_top!: boolean;
  let accumulator!: bigint;
  let shift!: bigint;
  let pos!: bigint;
  let past_width!: boolean;
  let past_end!: boolean;
  let byte_!: bigint;
  let shifted!: bigint;
  let found!: bigint | null;
  canonical = Array.from(canonicalizeSignedLe(value));
  i0 = 0n;
  i1 = 1n;
  i8 = 8n;
  i9 = 9n;
  u0 = 0n;
  u8 = 8n;
  u128 = 128n;
  length = blen(canonical);
  last_pos = (length - i1);
  last = bget(canonical, last_pos);
  sign_bit = (last & u128);
  negative = (sign_bit !== u0);
  if (negative) {
    none = null;
    return none;
  }
  too_wide = (length > i9);
  if (too_wide) {
    none = null;
    return none;
  }
  at_limit = (length === i9);
  if (at_limit) {
    top = bget(canonical, i8);
    magnitude_in_top = (top !== u0);
    if (magnitude_in_top) {
      none = null;
      return none;
    }
  }
  accumulator = u0;
  shift = u0;
  pos = i0;
  for (;;) {
    past_width = (pos >= i8);
    if (past_width) {
      break;
    }
    past_end = (pos >= length);
    if (past_end) {
      break;
    }
    byte_ = bget(canonical, pos);
    shifted = ((byte_ << shift) & MASK);
    accumulator = (accumulator | shifted);
    shift = ((shift + u8) & MASK);
    pos = (pos + i1);
  }
  found = accumulator;
  return found;
}

export function maxFiniteGlobalRank(): Uint8Array {
  let max_finite_lex!: bigint;
  let lex!: number[];
  let two!: number[];
  let one!: number[];
  let doubled!: number[];
  let rank!: number[];
  max_finite_lex = 18442240474082181119n;
  lex = Array.from(u64ToBigintLe(max_finite_lex));
  two = Array.from(bigintTwo());
  one = Array.from(bigintOne());
  doubled = Array.from(signedMulLe(Uint8Array.from(lex), Uint8Array.from(two)));
  rank = Array.from(signedAddLe(Uint8Array.from(doubled), Uint8Array.from(one)));
  return Uint8Array.from(rank);
}

export function floatGlobalRank(value: number): Uint8Array {
  let one!: number[];
  let two!: number[];
  let is_nan!: boolean;
  let mantissa_mask!: bigint;
  let quiet_bit!: bigint;
  let u63!: bigint;
  let bits!: bigint;
  let mantissa!: bigint;
  let nan_offset!: bigint;
  let sign!: bigint;
  let base!: number[];
  let three!: number[];
  let offset_big!: number[];
  let sign_big!: number[];
  let spread!: number[];
  let with_base!: number[];
  let with_offset!: number[];
  let rank!: number[];
  let is_infinite!: boolean;
  let zero!: number;
  let positive!: boolean;
  let negative!: boolean;
  let magnitude!: number;
  let lex!: bigint;
  let lex_big!: number[];
  let doubled!: number[];
  one = Array.from(bigintOne());
  two = Array.from(bigintTwo());
  is_nan = Number.isNaN(value);
  if (is_nan) {
    mantissa_mask = 4503599627370495n;
    quiet_bit = 2251799813685248n;
    u63 = 63n;
    bits = f2bits(value);
    mantissa = (bits & mantissa_mask);
    nan_offset = (mantissa ^ quiet_bit);
    sign = (bits >> u63);
    base = Array.from(maxFiniteGlobalRank());
    three = Array.from(signedAddLe(Uint8Array.from(two), Uint8Array.from(one)));
    offset_big = Array.from(u64ToBigintLe(nan_offset));
    sign_big = Array.from(u64ToBigintLe(sign));
    spread = Array.from(signedMulLe(Uint8Array.from(offset_big), Uint8Array.from(two)));
    with_base = Array.from(signedAddLe(Uint8Array.from(base), Uint8Array.from(three)));
    with_offset = Array.from(signedAddLe(Uint8Array.from(with_base), Uint8Array.from(spread)));
    rank = Array.from(signedAddLe(Uint8Array.from(with_offset), Uint8Array.from(sign_big)));
    return Uint8Array.from(rank);
  }
  is_infinite = isInf(value);
  if (is_infinite) {
    zero = 0;
    base = Array.from(maxFiniteGlobalRank());
    positive = (value > zero);
    if (positive) {
      rank = Array.from(signedAddLe(Uint8Array.from(base), Uint8Array.from(one)));
      return Uint8Array.from(rank);
    }
    rank = Array.from(signedAddLe(Uint8Array.from(base), Uint8Array.from(two)));
    return Uint8Array.from(rank);
  }
  negative = signbit(value);
  magnitude = f64Abs(value);
  lex = floatToIndex(magnitude);
  lex_big = Array.from(u64ToBigintLe(lex));
  doubled = Array.from(signedMulLe(Uint8Array.from(lex_big), Uint8Array.from(two)));
  sign_big = Array.from(bigintZero());
  if (negative) {
    sign_big = Array.from(bigintOne());
  }
  rank = Array.from(signedAddLe(Uint8Array.from(doubled), Uint8Array.from(sign_big)));
  return Uint8Array.from(rank);
}

export function floatFromGlobalRank(rank: Uint8Array): number | null {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u52!: bigint;
  let u56!: bigint;
  let u63!: bigint;
  let one!: number[];
  let two!: number[];
  let max_finite!: number[];
  let ordering!: bigint;
  let beyond_finite!: boolean;
  let offset!: number[];
  let is_positive_infinity!: bigint;
  let positive_infinity_slot!: boolean;
  let infinity!: number;
  let found!: number | null;
  let is_negative_infinity!: bigint;
  let negative_infinity_slot!: boolean;
  let negative_infinity!: number;
  let three!: number[];
  let nan_relative!: number[];
  let sign_big!: number[];
  let mantissa_big!: number[];
  let mantissa_opt!: bigint | null;
  let mantissa_fits!: boolean;
  let mantissa_too_wide!: boolean;
  let none!: number | null;
  let mantissa_base!: bigint;
  let overflow!: bigint;
  let overflows!: boolean;
  let quiet_bit!: bigint;
  let exponent_bits!: bigint;
  let mantissa!: bigint;
  let sign_opt!: bigint | null;
  let sign!: bigint;
  let sign_shifted!: bigint;
  let with_exponent!: bigint;
  let bits!: bigint;
  let candidate!: number;
  let candidate_is_nan!: boolean;
  let negative_big!: number[];
  let magnitude_big!: number[];
  let magnitude_opt!: bigint | null;
  let magnitude_fits!: boolean;
  let magnitude_too_wide!: boolean;
  let lex!: bigint;
  let simple_flag!: bigint;
  let simple!: boolean;
  let high_bits!: bigint;
  let too_large_for_simple!: boolean;
  let unreachable_!: boolean;
  let magnitude!: number;
  let negative!: boolean;
  let mirrored!: number;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  u52 = 52n;
  u56 = 56n;
  u63 = 63n;
  one = Array.from(bigintOne());
  two = Array.from(bigintTwo());
  max_finite = Array.from(maxFiniteGlobalRank());
  ordering = signedCompareLe(rank, Uint8Array.from(max_finite));
  beyond_finite = (ordering === i1);
  if (beyond_finite) {
    offset = Array.from(signedSubLe(rank, Uint8Array.from(max_finite)));
    is_positive_infinity = signedCompareLe(Uint8Array.from(offset), Uint8Array.from(one));
    positive_infinity_slot = (is_positive_infinity === i0);
    if (positive_infinity_slot) {
      infinity = f64Infinity();
      found = infinity;
      return found;
    }
    is_negative_infinity = signedCompareLe(Uint8Array.from(offset), Uint8Array.from(two));
    negative_infinity_slot = (is_negative_infinity === i0);
    if (negative_infinity_slot) {
      negative_infinity = f64NegInfinity();
      found = negative_infinity;
      return found;
    }
    three = Array.from(signedAddLe(Uint8Array.from(two), Uint8Array.from(one)));
    nan_relative = Array.from(signedSubLe(Uint8Array.from(offset), Uint8Array.from(three)));
    sign_big = Array.from(positiveRemLeNonzero(Uint8Array.from(nan_relative), Uint8Array.from(two)));
    mantissa_big = Array.from(positiveDivLeNonzero(Uint8Array.from(nan_relative), Uint8Array.from(two)));
    mantissa_opt = bigintToU64Le(Uint8Array.from(mantissa_big));
    mantissa_fits = (mantissa_opt !== null);
    mantissa_too_wide = (!mantissa_fits);
    if (mantissa_too_wide) {
      none = null;
      return none;
    }
    mantissa_base = mantissa_opt!;
    overflow = (mantissa_base >> u52);
    overflows = (overflow !== u0);
    if (overflows) {
      none = null;
      return none;
    }
    quiet_bit = 2251799813685248n;
    exponent_bits = 9218868437227405312n;
    mantissa = (mantissa_base ^ quiet_bit);
    sign_opt = bigintToU64Le(Uint8Array.from(sign_big));
    sign = sign_opt!;
    sign_shifted = ((sign << u63) & MASK);
    with_exponent = (sign_shifted | exponent_bits);
    bits = (with_exponent | mantissa);
    candidate = bits2f(bits);
    candidate_is_nan = Number.isNaN(candidate);
    if (candidate_is_nan) {
      found = candidate;
      return found;
    }
    none = null;
    return none;
  }
  negative_big = Array.from(positiveRemLeNonzero(rank, Uint8Array.from(two)));
  magnitude_big = Array.from(positiveDivLeNonzero(rank, Uint8Array.from(two)));
  magnitude_opt = bigintToU64Le(Uint8Array.from(magnitude_big));
  magnitude_fits = (magnitude_opt !== null);
  magnitude_too_wide = (!magnitude_fits);
  if (magnitude_too_wide) {
    none = null;
    return none;
  }
  lex = magnitude_opt!;
  simple_flag = (lex >> u63);
  simple = (simple_flag === u0);
  high_bits = (lex >> u56);
  too_large_for_simple = (high_bits !== u0);
  unreachable_ = (simple && too_large_for_simple);
  if (unreachable_) {
    none = null;
    return none;
  }
  magnitude = indexToFloat(lex);
  sign_opt = bigintToU64Le(Uint8Array.from(negative_big));
  sign = sign_opt!;
  negative = (sign === u1);
  if (negative) {
    mirrored = f64Neg(magnitude);
    found = mirrored;
    return found;
  }
  found = magnitude;
  return found;
}

export function floatChoiceMaxIndex(): Uint8Array {
  let nan_payloads!: bigint;
  let base!: number[];
  let two!: number[];
  let payloads!: number[];
  let with_infinities!: number[];
  let max_index!: number[];
  nan_payloads = 9007199254740992n;
  base = Array.from(maxFiniteGlobalRank());
  two = Array.from(bigintTwo());
  payloads = Array.from(u64ToBigintLe(nan_payloads));
  with_infinities = Array.from(signedAddLe(Uint8Array.from(base), Uint8Array.from(two)));
  max_index = Array.from(signedAddLe(Uint8Array.from(with_infinities), Uint8Array.from(payloads)));
  return Uint8Array.from(max_index);
}

export function floatChoiceToIndex(min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number, value: number): Uint8Array | null {
  let simplest_opt!: number | null;
  let present!: boolean;
  let absent!: boolean;
  let none!: Uint8Array | null;
  let simplest!: number;
  let value_rank!: number[];
  let simplest_rank!: number[];
  let index!: number[];
  let found!: Uint8Array | null;
  simplest_opt = floatSimplest(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero);
  present = (simplest_opt !== null);
  absent = (!present);
  if (absent) {
    none = null;
    return none;
  }
  simplest = simplest_opt!;
  value_rank = Array.from(floatGlobalRank(value));
  simplest_rank = Array.from(floatGlobalRank(simplest));
  index = Array.from(signedSubLe(Uint8Array.from(value_rank), Uint8Array.from(simplest_rank)));
  found = Uint8Array.from(index);
  return found;
}

export function floatChoiceFromIndex(min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number, index: Uint8Array): number | null {
  let simplest_opt!: number | null;
  let present!: boolean;
  let absent!: boolean;
  let none!: number | null;
  let simplest!: number;
  let simplest_rank!: number[];
  let raw!: number[];
  let i0!: bigint;
  let zero!: number[];
  let ordering!: bigint;
  let below_zero!: boolean;
  let candidate_opt!: number | null;
  let decoded!: boolean;
  let undecodable!: boolean;
  let candidate!: number;
  let valid!: boolean;
  let found!: number | null;
  simplest_opt = floatSimplest(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero);
  present = (simplest_opt !== null);
  absent = (!present);
  if (absent) {
    none = null;
    return none;
  }
  simplest = simplest_opt!;
  simplest_rank = Array.from(floatGlobalRank(simplest));
  raw = Array.from(signedAddLe(Uint8Array.from(simplest_rank), index));
  i0 = 0n;
  zero = Array.from(bigintZero());
  ordering = signedCompareLe(Uint8Array.from(raw), Uint8Array.from(zero));
  below_zero = (ordering < i0);
  if (below_zero) {
    none = null;
    return none;
  }
  candidate_opt = floatFromGlobalRank(Uint8Array.from(raw));
  decoded = (candidate_opt !== null);
  undecodable = (!decoded);
  if (undecodable) {
    none = null;
    return none;
  }
  candidate = candidate_opt!;
  valid = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, candidate);
  if (valid) {
    found = candidate;
    return found;
  }
  none = null;
  return none;
}

export function codeLengthCounts(lengths: Uint8Array, max_bits: bigint): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let counts!: number[];
  let max_bits_i!: bigint;
  let slots!: bigint;
  let width!: bigint;
  let fill!: bigint;
  let filled!: boolean;
  let n!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let length!: bigint;
  let unused!: boolean;
  let too_long!: boolean;
  let skip!: boolean;
  let countable!: boolean;
  let length_i!: bigint;
  let offset!: bigint;
  let high_offset!: bigint;
  let low!: bigint;
  let high!: bigint;
  let shifted!: bigint;
  let current!: bigint;
  let next_!: bigint;
  let next_low!: bigint;
  let next_shifted!: bigint;
  let next_high!: bigint;
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  u0 = 0n;
  u1 = 1n;
  u8 = 8n;
  u255 = 255n;
  counts = [];
  max_bits_i = BigInt.asIntN(64, max_bits);
  slots = (max_bits_i + i1);
  width = (slots * i2);
  fill = i0;
  for (;;) {
    filled = (fill >= width);
    if (filled) {
      break;
    }
    counts.push(Number(u0 & 0xffn));
    fill = (fill + i1);
  }
  n = blen(lengths);
  pos = i0;
  for (;;) {
    done = (pos >= n);
    if (done) {
      break;
    }
    length = bget(lengths, pos);
    unused = (length === u0);
    too_long = (length > max_bits);
    skip = (unused || too_long);
    countable = (!skip);
    if (countable) {
      length_i = BigInt.asIntN(64, length);
      offset = (length_i * i2);
      high_offset = (offset + i1);
      low = bget(counts, offset);
      high = bget(counts, high_offset);
      shifted = ((high << u8) & MASK);
      current = (low | shifted);
      next_ = ((current + u1) & MASK);
      next_low = (next_ & u255);
      next_shifted = (next_ >> u8);
      next_high = (next_shifted & u255);
      counts[Number(offset)] = Number(next_low & 0xffn);
      counts[Number(high_offset)] = Number(next_high & 0xffn);
    }
    pos = (pos + i1);
  }
  return Uint8Array.from(counts);
}

export function packedU16At(packed_: Uint8Array, slot: bigint): bigint {
  let i1!: bigint;
  let i2!: bigint;
  let u0!: bigint;
  let u8!: bigint;
  let n!: bigint;
  let slot_i!: bigint;
  let offset!: bigint;
  let high_offset!: bigint;
  let past_end!: boolean;
  let low!: bigint;
  let high!: bigint;
  let shifted!: bigint;
  let value!: bigint;
  i1 = 1n;
  i2 = 2n;
  u0 = 0n;
  u8 = 8n;
  n = blen(packed_);
  slot_i = BigInt.asIntN(64, slot);
  offset = (slot_i * i2);
  high_offset = (offset + i1);
  past_end = (high_offset >= n);
  if (past_end) {
    return u0;
  }
  low = bget(packed_, offset);
  high = bget(packed_, high_offset);
  shifted = ((high << u8) & MASK);
  value = (low | shifted);
  return value;
}

export function codeLengthCountAt(counts: Uint8Array, length: bigint): bigint {
  let value!: bigint;
  value = packedU16At(counts, length);
  return value;
}

export function codeLengthsValid(lengths: Uint8Array, max_bits: bigint): boolean {
  let u1!: bigint;
  let true_!: boolean;
  let false_!: boolean;
  let counts!: number[];
  let left!: bigint;
  let length!: bigint;
  let done!: boolean;
  let doubled!: bigint;
  let count!: bigint;
  let over!: boolean;
  u1 = 1n;
  true_ = true;
  false_ = false;
  counts = Array.from(codeLengthCounts(lengths, max_bits));
  left = u1;
  length = u1;
  for (;;) {
    done = (length > max_bits);
    if (done) {
      break;
    }
    doubled = ((left + left) & MASK);
    count = codeLengthCountAt(Uint8Array.from(counts), length);
    over = (count > doubled);
    if (over) {
      return false_;
    }
    left = ((doubled - count) & MASK);
    length = ((length + u1) & MASK);
  }
  return true_;
}

export function readBits(data: Uint8Array, bit_pos: bigint, count: bigint): bigint | null {
  let u0!: bigint;
  let u1!: bigint;
  let u3!: bigint;
  let u7!: bigint;
  let u8!: bigint;
  let u64!: bigint;
  let too_wide!: boolean;
  let none!: bigint | null;
  let n!: bigint;
  let n_u!: bigint;
  let available!: bigint;
  let end_!: bigint;
  let past_end!: boolean;
  let value!: bigint;
  let taken!: bigint;
  let done!: boolean;
  let at!: bigint;
  let byte_index!: bigint;
  let byte_offset!: bigint;
  let byte_!: bigint;
  let bit_index!: bigint;
  let shifted!: bigint;
  let bit!: bigint;
  let placed!: bigint;
  let some!: bigint | null;
  u0 = 0n;
  u1 = 1n;
  u3 = 3n;
  u7 = 7n;
  u8 = 8n;
  u64 = 64n;
  too_wide = (count > u64);
  if (too_wide) {
    none = null;
    return none;
  }
  n = blen(data);
  n_u = (n & MASK);
  available = ((n_u * u8) & MASK);
  end_ = ((bit_pos + count) & MASK);
  past_end = (end_ > available);
  if (past_end) {
    none = null;
    return none;
  }
  value = u0;
  taken = u0;
  for (;;) {
    done = (taken >= count);
    if (done) {
      break;
    }
    at = ((bit_pos + taken) & MASK);
    byte_index = (at >> u3);
    byte_offset = BigInt.asIntN(64, byte_index);
    byte_ = bget(data, byte_offset);
    bit_index = (at & u7);
    shifted = (byte_ >> bit_index);
    bit = (shifted & u1);
    placed = ((bit << taken) & MASK);
    value = (value | placed);
    taken = ((taken + u1) & MASK);
  }
  some = value;
  return some;
}

export function symbolOffsets(counts: Uint8Array, max_bits: bigint): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let offsets!: number[];
  let max_bits_i!: bigint;
  let slots!: bigint;
  let width!: bigint;
  let fill!: bigint;
  let filled!: boolean;
  let running!: bigint;
  let length!: bigint;
  let done!: boolean;
  let length_i!: bigint;
  let offset!: bigint;
  let high_offset!: bigint;
  let low!: bigint;
  let shifted!: bigint;
  let high!: bigint;
  let count!: bigint;
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  u0 = 0n;
  u1 = 1n;
  u8 = 8n;
  u255 = 255n;
  offsets = [];
  max_bits_i = BigInt.asIntN(64, max_bits);
  slots = (max_bits_i + i2);
  width = (slots * i2);
  fill = i0;
  for (;;) {
    filled = (fill >= width);
    if (filled) {
      break;
    }
    offsets.push(Number(u0 & 0xffn));
    fill = (fill + i1);
  }
  running = u0;
  length = u1;
  for (;;) {
    done = (length > max_bits);
    if (done) {
      break;
    }
    length_i = BigInt.asIntN(64, length);
    offset = (length_i * i2);
    high_offset = (offset + i1);
    low = (running & u255);
    shifted = (running >> u8);
    high = (shifted & u255);
    offsets[Number(offset)] = Number(low & 0xffn);
    offsets[Number(high_offset)] = Number(high & 0xffn);
    count = codeLengthCountAt(counts, length);
    running = ((running + count) & MASK);
    length = ((length + u1) & MASK);
  }
  return Uint8Array.from(offsets);
}

export function sortedSymbols(lengths: Uint8Array, max_bits: bigint): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let counts!: number[];
  let offsets!: number[];
  let coded!: bigint;
  let length!: bigint;
  let done!: boolean;
  let count!: bigint;
  let symbols!: number[];
  let coded_i!: bigint;
  let width!: bigint;
  let fill!: bigint;
  let filled!: boolean;
  let cursor!: number[];
  let n!: bigint;
  let symbol!: bigint;
  let unused!: boolean;
  let too_long!: boolean;
  let skip!: boolean;
  let placeable!: boolean;
  let slot!: bigint;
  let length_i!: bigint;
  let cursor_offset!: bigint;
  let cursor_high!: bigint;
  let next_!: bigint;
  let next_low!: bigint;
  let next_shifted!: bigint;
  let next_high!: bigint;
  let slot_i!: bigint;
  let slot_offset!: bigint;
  let slot_high!: bigint;
  let symbol_u!: bigint;
  let sym_low!: bigint;
  let sym_shifted!: bigint;
  let sym_high!: bigint;
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  u0 = 0n;
  u1 = 1n;
  u8 = 8n;
  u255 = 255n;
  counts = Array.from(codeLengthCounts(lengths, max_bits));
  offsets = Array.from(symbolOffsets(Uint8Array.from(counts), max_bits));
  coded = u0;
  length = u1;
  for (;;) {
    done = (length > max_bits);
    if (done) {
      break;
    }
    count = codeLengthCountAt(Uint8Array.from(counts), length);
    coded = ((coded + count) & MASK);
    length = ((length + u1) & MASK);
  }
  symbols = [];
  coded_i = BigInt.asIntN(64, coded);
  width = (coded_i * i2);
  fill = i0;
  for (;;) {
    filled = (fill >= width);
    if (filled) {
      break;
    }
    symbols.push(Number(u0 & 0xffn));
    fill = (fill + i1);
  }
  cursor = offsets.slice();
  n = blen(lengths);
  symbol = i0;
  for (;;) {
    done = (symbol >= n);
    if (done) {
      break;
    }
    length = bget(lengths, symbol);
    unused = (length === u0);
    too_long = (length > max_bits);
    skip = (unused || too_long);
    placeable = (!skip);
    if (placeable) {
      slot = codeLengthCountAt(Uint8Array.from(cursor), length);
      length_i = BigInt.asIntN(64, length);
      cursor_offset = (length_i * i2);
      cursor_high = (cursor_offset + i1);
      next_ = ((slot + u1) & MASK);
      next_low = (next_ & u255);
      next_shifted = (next_ >> u8);
      next_high = (next_shifted & u255);
      cursor[Number(cursor_offset)] = Number(next_low & 0xffn);
      cursor[Number(cursor_high)] = Number(next_high & 0xffn);
      slot_i = BigInt.asIntN(64, slot);
      slot_offset = (slot_i * i2);
      slot_high = (slot_offset + i1);
      symbol_u = (symbol & MASK);
      sym_low = (symbol_u & u255);
      sym_shifted = (symbol_u >> u8);
      sym_high = (sym_shifted & u255);
      symbols[Number(slot_offset)] = Number(sym_low & 0xffn);
      symbols[Number(slot_high)] = Number(sym_high & 0xffn);
    }
    symbol = (symbol + i1);
  }
  return Uint8Array.from(symbols);
}

export function huffmanDecode(data: Uint8Array, bit_pos: bigint, counts: Uint8Array, symbols: Uint8Array, max_bits: bigint): bigint | null {
  let u0!: bigint;
  let u1!: bigint;
  let u32!: bigint;
  let code!: bigint;
  let first!: bigint;
  let index!: bigint;
  let length!: bigint;
  let done!: boolean;
  let at!: bigint;
  let bit_at!: bigint;
  let bit!: bigint | null;
  let have_bit!: boolean;
  let truncated!: boolean;
  let none!: bigint | null;
  let bit_value!: bigint;
  let count!: bigint;
  let span!: bigint;
  let within!: boolean;
  let rank!: bigint;
  let slot!: bigint;
  let symbol!: bigint;
  let shifted_len!: bigint;
  let packed_!: bigint;
  let some!: bigint | null;
  u0 = 0n;
  u1 = 1n;
  u32 = 32n;
  code = u0;
  first = u0;
  index = u0;
  length = u1;
  for (;;) {
    done = (length > max_bits);
    if (done) {
      break;
    }
    at = ((length - u1) & MASK);
    bit_at = ((bit_pos + at) & MASK);
    bit = readBits(data, bit_at, u1);
    have_bit = (bit !== null);
    truncated = (!have_bit);
    if (truncated) {
      none = null;
      return none;
    }
    bit_value = bit!;
    code = (code | bit_value);
    count = codeLengthCountAt(counts, length);
    span = ((first + count) & MASK);
    within = (code < span);
    if (within) {
      rank = ((code - first) & MASK);
      slot = ((index + rank) & MASK);
      symbol = packedU16At(symbols, slot);
      shifted_len = ((length << u32) & MASK);
      packed_ = (shifted_len | symbol);
      some = packed_;
      return some;
    }
    index = ((index + count) & MASK);
    first = ((span + span) & MASK);
    code = ((code + code) & MASK);
    length = ((length + u1) & MASK);
  }
  none = null;
  return none;
}

export function lengthBase(symbol: bigint): bigint {
  let u0!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u4!: bigint;
  let u254!: bigint;
  let u257!: bigint;
  let u261!: bigint;
  let u264!: bigint;
  let u265!: bigint;
  let u285!: bigint;
  let u258!: bigint;
  let below!: boolean;
  let above!: boolean;
  let outside!: boolean;
  let is_max!: boolean;
  let flat!: boolean;
  let base!: bigint;
  let extra_index!: bigint;
  let extra!: bigint;
  let step!: bigint;
  let within!: bigint;
  let mantissa!: bigint;
  let scaled!: bigint;
  u0 = 0n;
  u2 = 2n;
  u3 = 3n;
  u4 = 4n;
  u254 = 254n;
  u257 = 257n;
  u261 = 261n;
  u264 = 264n;
  u265 = 265n;
  u285 = 285n;
  u258 = 258n;
  below = (symbol < u257);
  above = (symbol > u285);
  outside = (below || above);
  if (outside) {
    return u0;
  }
  is_max = (symbol === u285);
  if (is_max) {
    return u258;
  }
  flat = (symbol <= u264);
  if (flat) {
    base = ((symbol - u254) & MASK);
    return base;
  }
  extra_index = ((symbol - u261) & MASK);
  extra = (extra_index >> u2);
  step = ((symbol - u265) & MASK);
  within = (step & u3);
  mantissa = ((within + u4) & MASK);
  scaled = ((mantissa << extra) & MASK);
  base = ((scaled + u3) & MASK);
  return base;
}

export function lengthExtra(symbol: bigint): bigint {
  let u0!: bigint;
  let u2!: bigint;
  let u257!: bigint;
  let u261!: bigint;
  let u264!: bigint;
  let u285!: bigint;
  let below!: boolean;
  let above!: boolean;
  let outside!: boolean;
  let is_max!: boolean;
  let flat!: boolean;
  let extra_index!: bigint;
  let extra!: bigint;
  u0 = 0n;
  u2 = 2n;
  u257 = 257n;
  u261 = 261n;
  u264 = 264n;
  u285 = 285n;
  below = (symbol < u257);
  above = (symbol > u285);
  outside = (below || above);
  if (outside) {
    return u0;
  }
  is_max = (symbol === u285);
  if (is_max) {
    return u0;
  }
  flat = (symbol <= u264);
  if (flat) {
    return u0;
  }
  extra_index = ((symbol - u261) & MASK);
  extra = (extra_index >> u2);
  return extra;
}

export function distanceBase(symbol: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u29!: bigint;
  let above!: boolean;
  let flat!: boolean;
  let base!: bigint;
  let extra_index!: bigint;
  let extra!: bigint;
  let parity!: bigint;
  let mantissa!: bigint;
  let scaled!: bigint;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u29 = 29n;
  above = (symbol > u29);
  if (above) {
    return u0;
  }
  flat = (symbol <= u3);
  if (flat) {
    base = ((symbol + u1) & MASK);
    return base;
  }
  extra_index = ((symbol - u2) & MASK);
  extra = (extra_index >> u1);
  parity = (symbol & u1);
  mantissa = ((parity + u2) & MASK);
  scaled = ((mantissa << extra) & MASK);
  base = ((scaled + u1) & MASK);
  return base;
}

export function distanceExtra(symbol: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u29!: bigint;
  let above!: boolean;
  let flat!: boolean;
  let extra_index!: bigint;
  let extra!: bigint;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u29 = 29n;
  above = (symbol > u29);
  if (above) {
    return u0;
  }
  flat = (symbol <= u3);
  if (flat) {
    return u0;
  }
  extra_index = ((symbol - u2) & MASK);
  extra = (extra_index >> u1);
  return extra;
}

export function fixedLiteralLengths(): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let i288!: bigint;
  let i144!: bigint;
  let i256!: bigint;
  let i280!: bigint;
  let u7!: bigint;
  let u8!: bigint;
  let u9!: bigint;
  let lengths!: number[];
  let symbol!: bigint;
  let done!: boolean;
  let length!: bigint;
  let past_144!: boolean;
  let below_256!: boolean;
  let is_nine!: boolean;
  let past_256!: boolean;
  let below_280!: boolean;
  let is_seven!: boolean;
  i0 = 0n;
  i1 = 1n;
  i288 = 288n;
  i144 = 144n;
  i256 = 256n;
  i280 = 280n;
  u7 = 7n;
  u8 = 8n;
  u9 = 9n;
  lengths = [];
  symbol = i0;
  for (;;) {
    done = (symbol >= i288);
    if (done) {
      break;
    }
    length = u8;
    past_144 = (symbol >= i144);
    below_256 = (symbol < i256);
    is_nine = (past_144 && below_256);
    if (is_nine) {
      length = u9;
    }
    past_256 = (symbol >= i256);
    below_280 = (symbol < i280);
    is_seven = (past_256 && below_280);
    if (is_seven) {
      length = u7;
    }
    lengths.push(Number(length & 0xffn));
    symbol = (symbol + i1);
  }
  return Uint8Array.from(lengths);
}

export function fixedDistanceLengths(): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let i30!: bigint;
  let u5!: bigint;
  let lengths!: number[];
  let symbol!: bigint;
  let done!: boolean;
  i0 = 0n;
  i1 = 1n;
  i30 = 30n;
  u5 = 5n;
  lengths = [];
  symbol = i0;
  for (;;) {
    done = (symbol >= i30);
    if (done) {
      break;
    }
    lengths.push(Number(u5 & 0xffn));
    symbol = (symbol + i1);
  }
  return Uint8Array.from(lengths);
}

export function codeLengthOrder(): Uint8Array {
  let order!: number[];
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u4!: bigint;
  let u5!: bigint;
  let u6!: bigint;
  let u7!: bigint;
  let u8!: bigint;
  let u9!: bigint;
  let u10!: bigint;
  let u11!: bigint;
  let u12!: bigint;
  let u13!: bigint;
  let u14!: bigint;
  let u15!: bigint;
  let u16!: bigint;
  let u17!: bigint;
  let u18!: bigint;
  order = [];
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u4 = 4n;
  u5 = 5n;
  u6 = 6n;
  u7 = 7n;
  u8 = 8n;
  u9 = 9n;
  u10 = 10n;
  u11 = 11n;
  u12 = 12n;
  u13 = 13n;
  u14 = 14n;
  u15 = 15n;
  u16 = 16n;
  u17 = 17n;
  u18 = 18n;
  order.push(Number(u16 & 0xffn));
  order.push(Number(u17 & 0xffn));
  order.push(Number(u18 & 0xffn));
  order.push(Number(u0 & 0xffn));
  order.push(Number(u8 & 0xffn));
  order.push(Number(u7 & 0xffn));
  order.push(Number(u9 & 0xffn));
  order.push(Number(u6 & 0xffn));
  order.push(Number(u10 & 0xffn));
  order.push(Number(u5 & 0xffn));
  order.push(Number(u11 & 0xffn));
  order.push(Number(u4 & 0xffn));
  order.push(Number(u12 & 0xffn));
  order.push(Number(u3 & 0xffn));
  order.push(Number(u13 & 0xffn));
  order.push(Number(u2 & 0xffn));
  order.push(Number(u14 & 0xffn));
  order.push(Number(u1 & 0xffn));
  order.push(Number(u15 & 0xffn));
  return Uint8Array.from(order);
}

export function maxDecompressedLen(): bigint {
  let max!: bigint;
  max = 16777216n;
  return max;
}

export function inflate(data: Uint8Array): Uint8Array | null {
  let limit!: bigint;
  let out!: Uint8Array | null;
  limit = maxDecompressedLen();
  out = inflateBounded(data, limit);
  return out;
}

export function inflateBounded(data: Uint8Array, limit: bigint): Uint8Array | null {
  let i0!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u4!: bigint;
  let u5!: bigint;
  let u7!: bigint;
  let u8!: bigint;
  let u15!: bigint;
  let u16!: bigint;
  let u17!: bigint;
  let u19!: bigint;
  let u32!: bigint;
  let u65535!: bigint;
  let u256!: bigint;
  let u257!: bigint;
  let u285!: bigint;
  let u286!: bigint;
  let u29!: bigint;
  let u30!: bigint;
  let u11!: bigint;
  let out!: number[];
  let bit_pos!: bigint;
  let order!: number[];
  let final_opt!: bigint | null;
  let have_final!: boolean;
  let no_final!: boolean;
  let none!: Uint8Array | null;
  let final_!: bigint;
  let type_opt!: bigint | null;
  let have_type!: boolean;
  let no_type!: boolean;
  let block_type!: bigint;
  let reserved!: boolean;
  let stored!: boolean;
  let slack!: bigint;
  let needs_pad!: boolean;
  let pad!: bigint;
  let len_opt!: bigint | null;
  let have_len!: boolean;
  let no_len!: boolean;
  let len_!: bigint;
  let nlen_opt!: bigint | null;
  let have_nlen!: boolean;
  let no_nlen!: boolean;
  let nlen!: bigint;
  let complement!: bigint;
  let agrees!: boolean;
  let disagrees!: boolean;
  let stored_produced!: bigint;
  let stored_produced_u!: bigint;
  let stored_total!: bigint;
  let stored_over!: boolean;
  let copied!: bigint;
  let copy_done!: boolean;
  let byte_opt!: bigint | null;
  let have_byte!: boolean;
  let no_byte!: boolean;
  let byte_!: bigint;
  let compressed!: boolean;
  let lit_lengths!: number[];
  let dist_lengths!: number[];
  let dynamic!: boolean;
  let hlit_opt!: bigint | null;
  let have_hlit!: boolean;
  let no_hlit!: boolean;
  let hlit_raw!: bigint;
  let hlit!: bigint;
  let hdist_opt!: bigint | null;
  let have_hdist!: boolean;
  let no_hdist!: boolean;
  let hdist_raw!: bigint;
  let hdist!: bigint;
  let hclen_opt!: bigint | null;
  let have_hclen!: boolean;
  let no_hclen!: boolean;
  let hclen_raw!: bigint;
  let hclen!: bigint;
  let hlit_bad!: boolean;
  let hdist_bad!: boolean;
  let header_bad!: boolean;
  let cl_lengths!: number[];
  let zero_fill!: bigint;
  let zeroed!: boolean;
  let cl_read!: bigint;
  let cl_done!: boolean;
  let cl_opt!: bigint | null;
  let have_cl!: boolean;
  let no_cl!: boolean;
  let cl_value!: bigint;
  let order_index!: bigint;
  let slot!: bigint;
  let cl_ok!: boolean;
  let cl_bad!: boolean;
  let cl_counts!: number[];
  let cl_symbols!: number[];
  let wanted!: bigint;
  let all_lengths!: number[];
  let have!: bigint;
  let previous!: bigint;
  let enough!: boolean;
  let decoded!: bigint | null;
  let have_decoded!: boolean;
  let no_decoded!: boolean;
  let packed_!: bigint;
  let used!: bigint;
  let symbol!: bigint;
  let literal!: boolean;
  let repeats!: boolean;
  let repeat_previous!: boolean;
  let extra_width!: bigint;
  let run_base!: bigint;
  let value!: bigint;
  let nothing_yet!: boolean;
  let short_zeroes!: boolean;
  let extra_opt!: bigint | null;
  let have_extra!: boolean;
  let no_extra!: boolean;
  let extra!: bigint;
  let run!: bigint;
  let over!: bigint;
  let overruns!: boolean;
  let written!: bigint;
  let run_done!: boolean;
  let hlit_i!: bigint;
  let wanted_i!: bigint;
  let lit_ok!: boolean;
  let dist_ok!: boolean;
  let codes_ok!: boolean;
  let codes_bad!: boolean;
  let lit_counts!: number[];
  let lit_symbols!: number[];
  let dist_counts!: number[];
  let dist_symbols!: number[];
  let end_of_block!: boolean;
  let is_literal!: boolean;
  let literal_produced!: bigint;
  let literal_produced_u!: bigint;
  let literal_full!: boolean;
  let is_match!: boolean;
  let unknown!: boolean;
  let base!: bigint;
  let width!: bigint;
  let len_extra_opt!: bigint | null;
  let have_len_extra!: boolean;
  let no_len_extra!: boolean;
  let len_extra!: bigint;
  let match_length!: bigint;
  let dist_decoded!: bigint | null;
  let have_dist!: boolean;
  let no_dist!: boolean;
  let dist_packed!: bigint;
  let dist_used!: bigint;
  let dist_symbol!: bigint;
  let dist_unknown!: boolean;
  let dist_base!: bigint;
  let dist_width!: bigint;
  let dist_extra_opt!: bigint | null;
  let have_dist_extra!: boolean;
  let no_dist_extra!: boolean;
  let dist_extra!: bigint;
  let distance!: bigint;
  let produced!: bigint;
  let produced_u!: bigint;
  let too_far!: boolean;
  let match_total!: bigint;
  let match_over!: boolean;
  let from_!: bigint;
  let taken!: bigint;
  let match_done!: boolean;
  let at!: bigint;
  let at_i!: bigint;
  let last!: boolean;
  let some!: Uint8Array | null;
  i0 = 0n;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u4 = 4n;
  u5 = 5n;
  u7 = 7n;
  u8 = 8n;
  u15 = 15n;
  u16 = 16n;
  u17 = 17n;
  u19 = 19n;
  u32 = 32n;
  u65535 = 65535n;
  u256 = 256n;
  u257 = 257n;
  u285 = 285n;
  u286 = 286n;
  u29 = 29n;
  u30 = 30n;
  u11 = 11n;
  out = [];
  bit_pos = u0;
  order = Array.from(codeLengthOrder());
  for (;;) {
    final_opt = readBits(data, bit_pos, u1);
    have_final = (final_opt !== null);
    no_final = (!have_final);
    if (no_final) {
      none = null;
      return none;
    }
    final_ = final_opt!;
    bit_pos = ((bit_pos + u1) & MASK);
    type_opt = readBits(data, bit_pos, u2);
    have_type = (type_opt !== null);
    no_type = (!have_type);
    if (no_type) {
      none = null;
      return none;
    }
    block_type = type_opt!;
    bit_pos = ((bit_pos + u2) & MASK);
    reserved = (block_type === u3);
    if (reserved) {
      none = null;
      return none;
    }
    stored = (block_type === u0);
    if (stored) {
      slack = (bit_pos & u7);
      needs_pad = (slack > u0);
      if (needs_pad) {
        pad = ((u8 - slack) & MASK);
        bit_pos = ((bit_pos + pad) & MASK);
      }
      len_opt = readBits(data, bit_pos, u16);
      have_len = (len_opt !== null);
      no_len = (!have_len);
      if (no_len) {
        none = null;
        return none;
      }
      len_ = len_opt!;
      bit_pos = ((bit_pos + u16) & MASK);
      nlen_opt = readBits(data, bit_pos, u16);
      have_nlen = (nlen_opt !== null);
      no_nlen = (!have_nlen);
      if (no_nlen) {
        none = null;
        return none;
      }
      nlen = nlen_opt!;
      bit_pos = ((bit_pos + u16) & MASK);
      complement = (len_ ^ u65535);
      agrees = (nlen === complement);
      disagrees = (!agrees);
      if (disagrees) {
        none = null;
        return none;
      }
      stored_produced = blen(out);
      stored_produced_u = (stored_produced & MASK);
      stored_total = ((stored_produced_u + len_) & MASK);
      stored_over = (stored_total > limit);
      if (stored_over) {
        none = null;
        return none;
      }
      copied = u0;
      for (;;) {
        copy_done = (copied >= len_);
        if (copy_done) {
          break;
        }
        byte_opt = readBits(data, bit_pos, u8);
        have_byte = (byte_opt !== null);
        no_byte = (!have_byte);
        if (no_byte) {
          none = null;
          return none;
        }
        byte_ = byte_opt!;
        out.push(Number(byte_ & 0xffn));
        bit_pos = ((bit_pos + u8) & MASK);
        copied = ((copied + u1) & MASK);
      }
    }
    compressed = (!stored);
    if (compressed) {
      lit_lengths = Array.from(fixedLiteralLengths());
      dist_lengths = Array.from(fixedDistanceLengths());
      dynamic = (block_type === u2);
      if (dynamic) {
        hlit_opt = readBits(data, bit_pos, u5);
        have_hlit = (hlit_opt !== null);
        no_hlit = (!have_hlit);
        if (no_hlit) {
          none = null;
          return none;
        }
        hlit_raw = hlit_opt!;
        hlit = ((hlit_raw + u257) & MASK);
        bit_pos = ((bit_pos + u5) & MASK);
        hdist_opt = readBits(data, bit_pos, u5);
        have_hdist = (hdist_opt !== null);
        no_hdist = (!have_hdist);
        if (no_hdist) {
          none = null;
          return none;
        }
        hdist_raw = hdist_opt!;
        hdist = ((hdist_raw + u1) & MASK);
        bit_pos = ((bit_pos + u5) & MASK);
        hclen_opt = readBits(data, bit_pos, u4);
        have_hclen = (hclen_opt !== null);
        no_hclen = (!have_hclen);
        if (no_hclen) {
          none = null;
          return none;
        }
        hclen_raw = hclen_opt!;
        hclen = ((hclen_raw + u4) & MASK);
        bit_pos = ((bit_pos + u4) & MASK);
        hlit_bad = (hlit > u286);
        hdist_bad = (hdist > u30);
        header_bad = (hlit_bad || hdist_bad);
        if (header_bad) {
          none = null;
          return none;
        }
        cl_lengths = [];
        zero_fill = u0;
        for (;;) {
          zeroed = (zero_fill >= u19);
          if (zeroed) {
            break;
          }
          cl_lengths.push(Number(u0 & 0xffn));
          zero_fill = ((zero_fill + u1) & MASK);
        }
        cl_read = u0;
        for (;;) {
          cl_done = (cl_read >= hclen);
          if (cl_done) {
            break;
          }
          cl_opt = readBits(data, bit_pos, u3);
          have_cl = (cl_opt !== null);
          no_cl = (!have_cl);
          if (no_cl) {
            none = null;
            return none;
          }
          cl_value = cl_opt!;
          bit_pos = ((bit_pos + u3) & MASK);
          order_index = BigInt.asIntN(64, cl_read);
          slot = bget(order, order_index);
          cl_lengths[Number(slot)] = Number(cl_value & 0xffn);
          cl_read = ((cl_read + u1) & MASK);
        }
        cl_ok = codeLengthsValid(Uint8Array.from(cl_lengths), u7);
        cl_bad = (!cl_ok);
        if (cl_bad) {
          none = null;
          return none;
        }
        cl_counts = Array.from(codeLengthCounts(Uint8Array.from(cl_lengths), u7));
        cl_symbols = Array.from(sortedSymbols(Uint8Array.from(cl_lengths), u7));
        wanted = ((hlit + hdist) & MASK);
        all_lengths = [];
        have = u0;
        previous = u0;
        for (;;) {
          enough = (have >= wanted);
          if (enough) {
            break;
          }
          decoded = huffmanDecode(data, bit_pos, Uint8Array.from(cl_counts), Uint8Array.from(cl_symbols), u7);
          have_decoded = (decoded !== null);
          no_decoded = (!have_decoded);
          if (no_decoded) {
            none = null;
            return none;
          }
          packed_ = decoded!;
          used = (packed_ >> u32);
          symbol = (packed_ & u65535);
          bit_pos = ((bit_pos + used) & MASK);
          literal = (symbol < u16);
          if (literal) {
            all_lengths.push(Number(symbol & 0xffn));
            previous = symbol;
            have = ((have + u1) & MASK);
          }
          repeats = (!literal);
          if (repeats) {
            repeat_previous = (symbol === u16);
            extra_width = u7;
            run_base = u11;
            value = u0;
            if (repeat_previous) {
              extra_width = u2;
              run_base = u3;
              value = previous;
              nothing_yet = (have === u0);
              if (nothing_yet) {
                none = null;
                return none;
              }
            }
            short_zeroes = (symbol === u17);
            if (short_zeroes) {
              extra_width = u3;
              run_base = u3;
            }
            extra_opt = readBits(data, bit_pos, extra_width);
            have_extra = (extra_opt !== null);
            no_extra = (!have_extra);
            if (no_extra) {
              none = null;
              return none;
            }
            extra = extra_opt!;
            bit_pos = ((bit_pos + extra_width) & MASK);
            run = ((run_base + extra) & MASK);
            over = ((have + run) & MASK);
            overruns = (over > wanted);
            if (overruns) {
              none = null;
              return none;
            }
            written = u0;
            for (;;) {
              run_done = (written >= run);
              if (run_done) {
                break;
              }
              all_lengths.push(Number(value & 0xffn));
              written = ((written + u1) & MASK);
            }
            have = ((have + run) & MASK);
          }
        }
        hlit_i = BigInt.asIntN(64, hlit);
        wanted_i = BigInt.asIntN(64, wanted);
        lit_lengths = bslice(all_lengths, i0, hlit_i);
        dist_lengths = bslice(all_lengths, hlit_i, wanted_i);
      }
      lit_ok = codeLengthsValid(Uint8Array.from(lit_lengths), u15);
      dist_ok = codeLengthsValid(Uint8Array.from(dist_lengths), u15);
      codes_ok = (lit_ok && dist_ok);
      codes_bad = (!codes_ok);
      if (codes_bad) {
        none = null;
        return none;
      }
      lit_counts = Array.from(codeLengthCounts(Uint8Array.from(lit_lengths), u15));
      lit_symbols = Array.from(sortedSymbols(Uint8Array.from(lit_lengths), u15));
      dist_counts = Array.from(codeLengthCounts(Uint8Array.from(dist_lengths), u15));
      dist_symbols = Array.from(sortedSymbols(Uint8Array.from(dist_lengths), u15));
      for (;;) {
        decoded = huffmanDecode(data, bit_pos, Uint8Array.from(lit_counts), Uint8Array.from(lit_symbols), u15);
        have_decoded = (decoded !== null);
        no_decoded = (!have_decoded);
        if (no_decoded) {
          none = null;
          return none;
        }
        packed_ = decoded!;
        used = (packed_ >> u32);
        symbol = (packed_ & u65535);
        bit_pos = ((bit_pos + used) & MASK);
        end_of_block = (symbol === u256);
        if (end_of_block) {
          break;
        }
        is_literal = (symbol < u256);
        if (is_literal) {
          literal_produced = blen(out);
          literal_produced_u = (literal_produced & MASK);
          literal_full = (literal_produced_u >= limit);
          if (literal_full) {
            none = null;
            return none;
          }
          out.push(Number(symbol & 0xffn));
        }
        is_match = (symbol > u256);
        if (is_match) {
          unknown = (symbol > u285);
          if (unknown) {
            none = null;
            return none;
          }
          base = lengthBase(symbol);
          width = lengthExtra(symbol);
          len_extra_opt = readBits(data, bit_pos, width);
          have_len_extra = (len_extra_opt !== null);
          no_len_extra = (!have_len_extra);
          if (no_len_extra) {
            none = null;
            return none;
          }
          len_extra = len_extra_opt!;
          bit_pos = ((bit_pos + width) & MASK);
          match_length = ((base + len_extra) & MASK);
          dist_decoded = huffmanDecode(data, bit_pos, Uint8Array.from(dist_counts), Uint8Array.from(dist_symbols), u15);
          have_dist = (dist_decoded !== null);
          no_dist = (!have_dist);
          if (no_dist) {
            none = null;
            return none;
          }
          dist_packed = dist_decoded!;
          dist_used = (dist_packed >> u32);
          dist_symbol = (dist_packed & u65535);
          bit_pos = ((bit_pos + dist_used) & MASK);
          dist_unknown = (dist_symbol > u29);
          if (dist_unknown) {
            none = null;
            return none;
          }
          dist_base = distanceBase(dist_symbol);
          dist_width = distanceExtra(dist_symbol);
          dist_extra_opt = readBits(data, bit_pos, dist_width);
          have_dist_extra = (dist_extra_opt !== null);
          no_dist_extra = (!have_dist_extra);
          if (no_dist_extra) {
            none = null;
            return none;
          }
          dist_extra = dist_extra_opt!;
          bit_pos = ((bit_pos + dist_width) & MASK);
          distance = ((dist_base + dist_extra) & MASK);
          produced = blen(out);
          produced_u = (produced & MASK);
          too_far = (distance > produced_u);
          if (too_far) {
            none = null;
            return none;
          }
          match_total = ((produced_u + match_length) & MASK);
          match_over = (match_total > limit);
          if (match_over) {
            none = null;
            return none;
          }
          from_ = ((produced_u - distance) & MASK);
          taken = u0;
          for (;;) {
            match_done = (taken >= match_length);
            if (match_done) {
              break;
            }
            at = ((from_ + taken) & MASK);
            at_i = BigInt.asIntN(64, at);
            byte_ = bget(out, at_i);
            out.push(Number(byte_ & 0xffn));
            taken = ((taken + u1) & MASK);
          }
        }
      }
    }
    last = (final_ > u0);
    if (last) {
      break;
    }
  }
  some = Uint8Array.from(out);
  return some;
}

export function adler32(data: Uint8Array): bigint {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u16!: bigint;
  let u65521!: bigint;
  let low!: bigint;
  let high!: bigint;
  let n!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let low_sum!: bigint;
  let low_over!: boolean;
  let high_sum!: bigint;
  let high_over!: boolean;
  let shifted!: bigint;
  let value!: bigint;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  u16 = 16n;
  u65521 = 65521n;
  low = u1;
  high = u0;
  n = blen(data);
  pos = i0;
  for (;;) {
    done = (pos >= n);
    if (done) {
      break;
    }
    byte_ = bget(data, pos);
    low_sum = ((low + byte_) & MASK);
    low = low_sum;
    low_over = (low_sum >= u65521);
    if (low_over) {
      low = ((low_sum - u65521) & MASK);
    }
    high_sum = ((high + low) & MASK);
    high = high_sum;
    high_over = (high_sum >= u65521);
    if (high_over) {
      high = ((high_sum - u65521) & MASK);
    }
    pos = (pos + i1);
  }
  shifted = ((high << u16) & MASK);
  value = (shifted | low);
  return value;
}

export function zlibDecompress(data: Uint8Array): Uint8Array | null {
  let limit!: bigint;
  let out!: Uint8Array | null;
  limit = maxDecompressedLen();
  out = zlibDecompressBounded(data, limit);
  return out;
}

export function zlibDecompressBounded(data: Uint8Array, limit: bigint): Uint8Array | null {
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let i4!: bigint;
  let i6!: bigint;
  let u0!: bigint;
  let u8!: bigint;
  let u15!: bigint;
  let u31!: bigint;
  let u32!: bigint;
  let u256!: bigint;
  let n!: bigint;
  let too_short!: boolean;
  let none!: Uint8Array | null;
  let cmf!: bigint;
  let flg!: bigint;
  let method!: bigint;
  let not_deflate!: boolean;
  let scaled!: bigint;
  let header!: bigint;
  let check!: bigint;
  let reduced!: boolean;
  let bad_check!: boolean;
  let u32_flag!: bigint;
  let has_dict!: boolean;
  let body_end!: bigint;
  let body!: number[];
  let inflated!: Uint8Array | null;
  let present!: boolean;
  let missing!: boolean;
  let out!: number[];
  let expected!: bigint;
  let at!: bigint;
  let read_done!: boolean;
  let byte_!: bigint;
  let moved!: bigint;
  let actual!: bigint;
  let agrees!: boolean;
  let disagrees!: boolean;
  let some!: Uint8Array | null;
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  i4 = 4n;
  i6 = 6n;
  u0 = 0n;
  u8 = 8n;
  u15 = 15n;
  u31 = 31n;
  u32 = 32n;
  u256 = 256n;
  n = blen(data);
  too_short = (n < i6);
  if (too_short) {
    none = null;
    return none;
  }
  cmf = bget(data, i0);
  flg = bget(data, i1);
  method = (cmf & u15);
  not_deflate = (method !== u8);
  if (not_deflate) {
    none = null;
    return none;
  }
  scaled = ((cmf * u256) & MASK);
  header = ((scaled + flg) & MASK);
  check = header;
  for (;;) {
    reduced = (check < u31);
    if (reduced) {
      break;
    }
    check = ((check - u31) & MASK);
  }
  bad_check = (check !== u0);
  if (bad_check) {
    none = null;
    return none;
  }
  u32_flag = (flg & u32);
  has_dict = (u32_flag > u0);
  if (has_dict) {
    none = null;
    return none;
  }
  body_end = (n - i4);
  body = bslice(data, i2, body_end);
  inflated = inflateBounded(Uint8Array.from(body), limit);
  present = (inflated !== null);
  missing = (!present);
  if (missing) {
    none = null;
    return none;
  }
  out = Array.from(inflated!);
  expected = u0;
  at = body_end;
  for (;;) {
    read_done = (at >= n);
    if (read_done) {
      break;
    }
    byte_ = bget(data, at);
    moved = ((expected * u256) & MASK);
    expected = ((moved + byte_) & MASK);
    at = (at + i1);
  }
  actual = adler32(Uint8Array.from(out));
  agrees = (actual === expected);
  disagrees = (!agrees);
  if (disagrees) {
    none = null;
    return none;
  }
  some = Uint8Array.from(out);
  return some;
}

export function deflateWriteBits(state: Uint8Array, value: bigint, count: bigint): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let out!: number[];
  let n!: bigint;
  let copy_pos!: bigint;
  let copy_done!: boolean;
  let copy_byte!: bigint;
  let remaining!: bigint;
  let written!: bigint;
  let done!: boolean;
  let used!: bigint;
  let at_boundary!: boolean;
  let out_n!: bigint;
  let last!: bigint;
  let current!: bigint;
  let bit!: bigint;
  let shifted!: bigint;
  let next_!: bigint;
  let next_byte!: bigint;
  let next_used_raw!: bigint;
  let next_used!: bigint;
  let full!: boolean;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  u8 = 8n;
  u255 = 255n;
  out = [];
  n = blen(state);
  copy_pos = i0;
  for (;;) {
    copy_done = (copy_pos >= n);
    if (copy_done) {
      break;
    }
    copy_byte = bget(state, copy_pos);
    out.push(Number(copy_byte & 0xffn));
    copy_pos = (copy_pos + i1);
  }
  remaining = value;
  written = u0;
  for (;;) {
    done = (written >= count);
    if (done) {
      break;
    }
    used = bget(out, i0);
    at_boundary = (used === u0);
    if (at_boundary) {
      out.push(Number(u0 & 0xffn));
    }
    out_n = blen(out);
    last = (out_n - i1);
    current = bget(out, last);
    bit = (remaining & u1);
    shifted = ((bit << used) & MASK);
    next_ = (current | shifted);
    next_byte = (next_ & u255);
    out[Number(last)] = Number(next_byte & 0xffn);
    next_used_raw = ((used + u1) & MASK);
    next_used = next_used_raw;
    full = (next_used_raw === u8);
    if (full) {
      next_used = u0;
    }
    out[Number(i0)] = Number(next_used & 0xffn);
    remaining = (remaining >> u1);
    written = ((written + u1) & MASK);
  }
  return Uint8Array.from(out);
}

export function deflateDrainComplete(state: Uint8Array): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let used!: bigint;
  let n!: bigint;
  let end_!: bigint;
  let partial!: boolean;
  let out!: number[];
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  used = bget(state, i0);
  n = blen(state);
  end_ = n;
  partial = (used !== u0);
  if (partial) {
    end_ = (n - i1);
  }
  out = bslice(state, i1, end_);
  return Uint8Array.from(out);
}

export function deflateDrainCarry(state: Uint8Array): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let out!: number[];
  let used!: bigint;
  let partial!: boolean;
  let n!: bigint;
  let last!: bigint;
  let last_byte!: bigint;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  out = [];
  used = bget(state, i0);
  out.push(Number(used & 0xffn));
  partial = (used !== u0);
  if (partial) {
    n = blen(state);
    last = (n - i1);
    last_byte = bget(state, last);
    out.push(Number(last_byte & 0xffn));
  }
  return Uint8Array.from(out);
}

export function deflateReverseCode(code: bigint, width: bigint): bigint {
  let u64!: bigint;
  let reversed!: bigint;
  let shift!: bigint;
  let out!: bigint;
  u64 = 64n;
  reversed = rev64(code);
  shift = ((u64 - width) & MASK);
  out = (reversed >> shift);
  return out;
}

export function deflateFixedSymbol(state: Uint8Array, symbol: bigint): Uint8Array {
  let u0!: bigint;
  let u7!: bigint;
  let u8!: bigint;
  let u9!: bigint;
  let u48!: bigint;
  let u143!: bigint;
  let u144!: bigint;
  let u255!: bigint;
  let u256!: bigint;
  let u279!: bigint;
  let u280!: bigint;
  let u400!: bigint;
  let u192!: bigint;
  let code!: bigint;
  let code_width!: bigint;
  let first!: boolean;
  let second_low!: boolean;
  let second_high!: boolean;
  let second!: boolean;
  let third_low!: boolean;
  let third_high!: boolean;
  let third!: boolean;
  let fourth!: boolean;
  let offset!: bigint;
  let wire_code!: bigint;
  let out!: number[];
  u0 = 0n;
  u7 = 7n;
  u8 = 8n;
  u9 = 9n;
  u48 = 48n;
  u143 = 143n;
  u144 = 144n;
  u255 = 255n;
  u256 = 256n;
  u279 = 279n;
  u280 = 280n;
  u400 = 400n;
  u192 = 192n;
  code = u0;
  code_width = u8;
  first = (symbol <= u143);
  if (first) {
    code = ((u48 + symbol) & MASK);
  }
  second_low = (symbol >= u144);
  second_high = (symbol <= u255);
  second = (second_low && second_high);
  if (second) {
    code = ((u400 + symbol) & MASK);
    code = ((code - u144) & MASK);
    code_width = u9;
  }
  third_low = (symbol >= u256);
  third_high = (symbol <= u279);
  third = (third_low && third_high);
  if (third) {
    code = ((symbol - u256) & MASK);
    code_width = u7;
  }
  fourth = (symbol >= u280);
  if (fourth) {
    offset = ((symbol - u280) & MASK);
    code = ((u192 + offset) & MASK);
    code_width = u8;
  }
  wire_code = deflateReverseCode(code, code_width);
  out = Array.from(deflateWriteBits(state, wire_code, code_width));
  return Uint8Array.from(out);
}

export function deflateHash(b0: bigint, b1: bigint, b2: bigint): bigint {
  let u8!: bigint;
  let u16!: bigint;
  let u17!: bigint;
  let u2654435761!: bigint;
  let u4294967295!: bigint;
  let b0s!: bigint;
  let b1s!: bigint;
  let partial!: bigint;
  let key!: bigint;
  let mixed!: bigint;
  let mixed32!: bigint;
  let bucket!: bigint;
  u8 = 8n;
  u16 = 16n;
  u17 = 17n;
  u2654435761 = 2654435761n;
  u4294967295 = 4294967295n;
  b0s = ((b0 << u16) & MASK);
  b1s = ((b1 << u8) & MASK);
  partial = (b0s | b1s);
  key = (partial | b2);
  mixed = ((key * u2654435761) & MASK);
  mixed32 = (mixed & u4294967295);
  bucket = (mixed32 >> u17);
  return bucket;
}

export function deflateTokenEntry(tag: bigint, value: bigint, distance: bigint): Uint8Array {
  let u8!: bigint;
  let u255!: bigint;
  let value_u!: bigint;
  let distance_u!: bigint;
  let value_low!: bigint;
  let value_shifted!: bigint;
  let value_high!: bigint;
  let distance_low!: bigint;
  let distance_shifted!: bigint;
  let distance_high!: bigint;
  let entry!: number[];
  u8 = 8n;
  u255 = 255n;
  value_u = (value & MASK);
  distance_u = (distance & MASK);
  value_low = (value_u & u255);
  value_shifted = (value_u >> u8);
  value_high = (value_shifted & u255);
  distance_low = (distance_u & u255);
  distance_shifted = (distance_u >> u8);
  distance_high = (distance_shifted & u255);
  entry = [];
  entry.push(Number(tag & 0xffn));
  entry.push(Number(value_low & 0xffn));
  entry.push(Number(value_high & 0xffn));
  entry.push(Number(distance_low & 0xffn));
  entry.push(Number(distance_high & 0xffn));
  return Uint8Array.from(entry);
}

export function deflateTokens(data: Uint8Array): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let i3!: bigint;
  let i5!: bigint;
  let i128!: bigint;
  let i258!: bigint;
  let i32768!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u4!: bigint;
  let u8!: bigint;
  let u16!: bigint;
  let u24!: bigint;
  let u255!: bigint;
  let u32767!: bigint;
  let u131072!: bigint;
  let tokens!: number[];
  let n!: bigint;
  let head!: number[];
  let prev!: number[];
  let hashed!: bigint;
  let pos!: bigint;
  let saved_length!: bigint;
  let saved_distance!: bigint;
  let done!: boolean;
  let caught_up!: boolean;
  let hash_end!: bigint;
  let hashable!: boolean;
  let hb0!: bigint;
  let hb1_at!: bigint;
  let hb1!: bigint;
  let hb2!: bigint;
  let bucket!: bigint;
  let head_off_u!: bigint;
  let head_off!: bigint;
  let head_off1!: bigint;
  let head_off2!: bigint;
  let head_off3!: bigint;
  let old0!: bigint;
  let old1!: bigint;
  let old2!: bigint;
  let old3!: bigint;
  let p_u!: bigint;
  let p_slot!: bigint;
  let prev_off_u!: bigint;
  let prev_off!: bigint;
  let prev_off1!: bigint;
  let prev_off2!: bigint;
  let prev_off3!: bigint;
  let p_b0!: bigint;
  let p_s1!: bigint;
  let p_b1!: bigint;
  let p_s2!: bigint;
  let p_b2!: bigint;
  let p_s3!: bigint;
  let p_b3!: bigint;
  let has_saved!: boolean;
  let threshold!: bigint;
  let best_length!: bigint;
  let best_distance!: bigint;
  let probes_left!: bigint;
  let tail2!: bigint;
  let searchable!: boolean;
  let window_start!: bigint;
  let before_start!: boolean;
  let sb0!: bigint;
  let sb1_at!: bigint;
  let sb1!: bigint;
  let sb2!: bigint;
  let search_bucket!: bigint;
  let sh_off_u!: bigint;
  let sh_off!: bigint;
  let sh_off1!: bigint;
  let sh_off2!: bigint;
  let sh_off3!: bigint;
  let c0!: bigint;
  let c1!: bigint;
  let c2!: bigint;
  let c3!: bigint;
  let c1s!: bigint;
  let c2s!: bigint;
  let c3s!: bigint;
  let c01!: bigint;
  let c012!: bigint;
  let candidate_u!: bigint;
  let candidate!: bigint;
  let in_window!: boolean;
  let out_of_window!: boolean;
  let distance!: bigint;
  let matched!: bigint;
  let at_limit!: boolean;
  let target_at!: bigint;
  let past_input!: boolean;
  let source_offset!: bigint;
  let offset_small!: boolean;
  let source_at!: bigint;
  let source_byte!: bigint;
  let target_byte!: bigint;
  let different!: boolean;
  let better!: boolean;
  let maximal!: boolean;
  let exhausted!: boolean;
  let c_u!: bigint;
  let c_slot!: bigint;
  let pv_off_u!: bigint;
  let pv_off!: bigint;
  let pv_off1!: bigint;
  let pv_off2!: bigint;
  let pv_off3!: bigint;
  let pv0!: bigint;
  let pv1!: bigint;
  let pv2!: bigint;
  let pv3!: bigint;
  let pv1s!: bigint;
  let pv2s!: bigint;
  let pv3s!: bigint;
  let pv01!: bigint;
  let pv012!: bigint;
  let next_u!: bigint;
  let found!: boolean;
  let current_length!: bigint;
  let current_distance!: bigint;
  let later_better!: boolean;
  let literal_at!: bigint;
  let literal_u!: bigint;
  let literal!: bigint;
  let entry!: number[];
  let entry_at!: bigint;
  let entry_done!: boolean;
  let entry_byte!: bigint;
  let long_!: boolean;
  let short_!: boolean;
  let keep_saved!: boolean;
  let remaining!: bigint;
  let no_saved!: boolean;
  let has_match!: boolean;
  let no_match!: boolean;
  let pending!: boolean;
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  i3 = 3n;
  i5 = 5n;
  i128 = 128n;
  i258 = 258n;
  i32768 = 32768n;
  u0 = 0n;
  u1 = 1n;
  u4 = 4n;
  u8 = 8n;
  u16 = 16n;
  u24 = 24n;
  u255 = 255n;
  u32767 = 32767n;
  u131072 = 131072n;
  tokens = [];
  n = blen(data);
  head = new Array<number>(Number(u131072)).fill(0);
  prev = new Array<number>(Number(u131072)).fill(0);
  hashed = i1;
  pos = i0;
  saved_length = i0;
  saved_distance = i0;
  for (;;) {
    done = (pos >= n);
    if (done) {
      break;
    }
    for (;;) {
      caught_up = (hashed >= pos);
      if (caught_up) {
        break;
      }
      hash_end = (hashed + i2);
      hashable = (hash_end < n);
      if (hashable) {
        hb0 = bget(data, hashed);
        hb1_at = (hashed + i1);
        hb1 = bget(data, hb1_at);
        hb2 = bget(data, hash_end);
        bucket = deflateHash(hb0, hb1, hb2);
        head_off_u = ((bucket * u4) & MASK);
        head_off = BigInt.asIntN(64, head_off_u);
        head_off1 = (head_off + i1);
        head_off2 = (head_off + i2);
        head_off3 = (head_off + i3);
        old0 = bget(head, head_off);
        old1 = bget(head, head_off1);
        old2 = bget(head, head_off2);
        old3 = bget(head, head_off3);
        p_u = (hashed & MASK);
        p_slot = (p_u & u32767);
        prev_off_u = ((p_slot * u4) & MASK);
        prev_off = BigInt.asIntN(64, prev_off_u);
        prev_off1 = (prev_off + i1);
        prev_off2 = (prev_off + i2);
        prev_off3 = (prev_off + i3);
        prev[Number(prev_off)] = Number(old0 & 0xffn);
        prev[Number(prev_off1)] = Number(old1 & 0xffn);
        prev[Number(prev_off2)] = Number(old2 & 0xffn);
        prev[Number(prev_off3)] = Number(old3 & 0xffn);
        p_b0 = (p_u & u255);
        p_s1 = (p_u >> u8);
        p_b1 = (p_s1 & u255);
        p_s2 = (p_u >> u16);
        p_b2 = (p_s2 & u255);
        p_s3 = (p_u >> u24);
        p_b3 = (p_s3 & u255);
        head[Number(head_off)] = Number(p_b0 & 0xffn);
        head[Number(head_off1)] = Number(p_b1 & 0xffn);
        head[Number(head_off2)] = Number(p_b2 & 0xffn);
        head[Number(head_off3)] = Number(p_b3 & 0xffn);
      }
      hashed = (hashed + i1);
    }
    has_saved = (saved_length > i0);
    threshold = i2;
    if (has_saved) {
      threshold = saved_length;
    }
    best_length = threshold;
    best_distance = i0;
    probes_left = i128;
    tail2 = (pos + i2);
    searchable = (tail2 < n);
    if (searchable) {
      window_start = (pos - i32768);
      before_start = (window_start < i1);
      if (before_start) {
        window_start = i1;
      }
      sb0 = bget(data, pos);
      sb1_at = (pos + i1);
      sb1 = bget(data, sb1_at);
      sb2 = bget(data, tail2);
      search_bucket = deflateHash(sb0, sb1, sb2);
      sh_off_u = ((search_bucket * u4) & MASK);
      sh_off = BigInt.asIntN(64, sh_off_u);
      sh_off1 = (sh_off + i1);
      sh_off2 = (sh_off + i2);
      sh_off3 = (sh_off + i3);
      c0 = bget(head, sh_off);
      c1 = bget(head, sh_off1);
      c2 = bget(head, sh_off2);
      c3 = bget(head, sh_off3);
      c1s = ((c1 << u8) & MASK);
      c2s = ((c2 << u16) & MASK);
      c3s = ((c3 << u24) & MASK);
      c01 = (c0 | c1s);
      c012 = (c01 | c2s);
      candidate_u = (c012 | c3s);
      candidate = BigInt.asIntN(64, candidate_u);
      for (;;) {
        in_window = (candidate >= window_start);
        out_of_window = (!in_window);
        if (out_of_window) {
          break;
        }
        distance = (pos - candidate);
        matched = i0;
        for (;;) {
          at_limit = (matched >= i258);
          if (at_limit) {
            break;
          }
          target_at = (pos + matched);
          past_input = (target_at >= n);
          if (past_input) {
            break;
          }
          source_offset = matched;
          for (;;) {
            offset_small = (source_offset < distance);
            if (offset_small) {
              break;
            }
            source_offset = (source_offset - distance);
          }
          source_at = (candidate + source_offset);
          source_byte = bget(data, source_at);
          target_byte = bget(data, target_at);
          different = (source_byte !== target_byte);
          if (different) {
            break;
          }
          matched = (matched + i1);
        }
        better = (matched > best_length);
        if (better) {
          best_length = matched;
          best_distance = distance;
        }
        maximal = (best_length === i258);
        if (maximal) {
          break;
        }
        probes_left = (probes_left - i1);
        exhausted = (probes_left <= i0);
        if (exhausted) {
          break;
        }
        c_u = (candidate & MASK);
        c_slot = (c_u & u32767);
        pv_off_u = ((c_slot * u4) & MASK);
        pv_off = BigInt.asIntN(64, pv_off_u);
        pv_off1 = (pv_off + i1);
        pv_off2 = (pv_off + i2);
        pv_off3 = (pv_off + i3);
        pv0 = bget(prev, pv_off);
        pv1 = bget(prev, pv_off1);
        pv2 = bget(prev, pv_off2);
        pv3 = bget(prev, pv_off3);
        pv1s = ((pv1 << u8) & MASK);
        pv2s = ((pv2 << u16) & MASK);
        pv3s = ((pv3 << u24) & MASK);
        pv01 = (pv0 | pv1s);
        pv012 = (pv01 | pv2s);
        next_u = (pv012 | pv3s);
        candidate = BigInt.asIntN(64, next_u);
      }
    }
    found = (best_distance > i0);
    current_length = i0;
    current_distance = i0;
    if (found) {
      current_length = best_length;
      current_distance = best_distance;
    }
    if (has_saved) {
      later_better = (current_length > saved_length);
      if (later_better) {
        literal_at = (pos - i1);
        literal_u = bget(data, literal_at);
        literal = BigInt.asIntN(64, literal_u);
        entry = Array.from(deflateTokenEntry(u0, literal, i0));
        entry_at = i0;
        for (;;) {
          entry_done = (entry_at >= i5);
          if (entry_done) {
            break;
          }
          entry_byte = bget(entry, entry_at);
          tokens.push(Number(entry_byte & 0xffn));
          entry_at = (entry_at + i1);
        }
        long_ = (current_length >= i128);
        if (long_) {
          entry = Array.from(deflateTokenEntry(u1, current_length, current_distance));
          entry_at = i0;
          for (;;) {
            entry_done = (entry_at >= i5);
            if (entry_done) {
              break;
            }
            entry_byte = bget(entry, entry_at);
            tokens.push(Number(entry_byte & 0xffn));
            entry_at = (entry_at + i1);
          }
          pos = (pos + current_length);
          saved_length = i0;
          saved_distance = i0;
        }
        short_ = (!long_);
        if (short_) {
          saved_length = current_length;
          saved_distance = current_distance;
          pos = (pos + i1);
        }
      }
      keep_saved = (!later_better);
      if (keep_saved) {
        entry = Array.from(deflateTokenEntry(u1, saved_length, saved_distance));
        entry_at = i0;
        for (;;) {
          entry_done = (entry_at >= i5);
          if (entry_done) {
            break;
          }
          entry_byte = bget(entry, entry_at);
          tokens.push(Number(entry_byte & 0xffn));
          entry_at = (entry_at + i1);
        }
        remaining = (saved_length - i1);
        pos = (pos + remaining);
        saved_length = i0;
        saved_distance = i0;
      }
    }
    no_saved = (!has_saved);
    if (no_saved) {
      has_match = (current_length >= i3);
      if (has_match) {
        long_ = (current_length >= i128);
        if (long_) {
          entry = Array.from(deflateTokenEntry(u1, current_length, current_distance));
          entry_at = i0;
          for (;;) {
            entry_done = (entry_at >= i5);
            if (entry_done) {
              break;
            }
            entry_byte = bget(entry, entry_at);
            tokens.push(Number(entry_byte & 0xffn));
            entry_at = (entry_at + i1);
          }
          pos = (pos + current_length);
        }
        short_ = (!long_);
        if (short_) {
          saved_length = current_length;
          saved_distance = current_distance;
          pos = (pos + i1);
        }
      }
      no_match = (!has_match);
      if (no_match) {
        literal_u = bget(data, pos);
        literal = BigInt.asIntN(64, literal_u);
        entry = Array.from(deflateTokenEntry(u0, literal, i0));
        entry_at = i0;
        for (;;) {
          entry_done = (entry_at >= i5);
          if (entry_done) {
            break;
          }
          entry_byte = bget(entry, entry_at);
          tokens.push(Number(entry_byte & 0xffn));
          entry_at = (entry_at + i1);
        }
        pos = (pos + i1);
      }
    }
  }
  pending = (saved_length > i0);
  if (pending) {
    entry = Array.from(deflateTokenEntry(u1, saved_length, saved_distance));
    entry_at = i0;
    for (;;) {
      entry_done = (entry_at >= i5);
      if (entry_done) {
        break;
      }
      entry_byte = bget(entry, entry_at);
      tokens.push(Number(entry_byte & 0xffn));
      entry_at = (entry_at + i1);
    }
  }
  return Uint8Array.from(tokens);
}

export function deflateFixed(data: Uint8Array): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let i3!: bigint;
  let i4!: bigint;
  let i5!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u3!: bigint;
  let u5!: bigint;
  let u8!: bigint;
  let u256!: bigint;
  let u257!: bigint;
  let u258!: bigint;
  let u285!: bigint;
  let u30!: bigint;
  let out!: number[];
  let state!: number[];
  let tokens!: number[];
  let n!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let tag!: bigint;
  let is_match!: boolean;
  let value_low_at!: bigint;
  let value_high_at!: bigint;
  let distance_low_at!: bigint;
  let distance_high_at!: bigint;
  let value_low!: bigint;
  let value_high!: bigint;
  let value_high_shifted!: bigint;
  let length_u!: bigint;
  let distance_low!: bigint;
  let distance_high!: bigint;
  let distance_high_shifted!: bigint;
  let distance_u!: bigint;
  let length_symbol!: bigint;
  let last_length!: boolean;
  let base!: bigint;
  let extra_count!: bigint;
  let span!: bigint;
  let upper!: bigint;
  let fits!: boolean;
  let maximum_length!: boolean;
  let length_base_value!: bigint;
  let length_extra_count!: bigint;
  let length_extra_value!: bigint;
  let distance_symbol!: bigint;
  let last_distance!: boolean;
  let distance_base_value!: bigint;
  let distance_extra_count!: bigint;
  let distance_span!: bigint;
  let distance_upper!: bigint;
  let distance_fits!: boolean;
  let distance_wire!: bigint;
  let distance_base_final!: bigint;
  let distance_extra_final!: bigint;
  let distance_value!: bigint;
  let is_literal!: boolean;
  let literal_at!: bigint;
  let literal!: bigint;
  let complete!: number[];
  let complete_n!: bigint;
  let drain_at!: bigint;
  let drain_done!: boolean;
  let drain_byte!: bigint;
  let state_n!: bigint;
  let tail_at!: bigint;
  let tail_done!: boolean;
  let tail_byte!: bigint;
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  i3 = 3n;
  i4 = 4n;
  i5 = 5n;
  u0 = 0n;
  u1 = 1n;
  u3 = 3n;
  u5 = 5n;
  u8 = 8n;
  u256 = 256n;
  u257 = 257n;
  u258 = 258n;
  u285 = 285n;
  u30 = 30n;
  out = [];
  state = [];
  state.push(Number(u0 & 0xffn));
  state = Array.from(deflateWriteBits(Uint8Array.from(state), u3, u3));
  tokens = Array.from(deflateTokens(data));
  n = blen(tokens);
  pos = i0;
  for (;;) {
    done = (pos >= n);
    if (done) {
      break;
    }
    tag = bget(tokens, pos);
    is_match = (tag === u1);
    if (is_match) {
      value_low_at = (pos + i1);
      value_high_at = (pos + i2);
      distance_low_at = (pos + i3);
      distance_high_at = (pos + i4);
      value_low = bget(tokens, value_low_at);
      value_high = bget(tokens, value_high_at);
      value_high_shifted = ((value_high << u8) & MASK);
      length_u = (value_low | value_high_shifted);
      distance_low = bget(tokens, distance_low_at);
      distance_high = bget(tokens, distance_high_at);
      distance_high_shifted = ((distance_high << u8) & MASK);
      distance_u = (distance_low | distance_high_shifted);
      length_symbol = u257;
      for (;;) {
        last_length = (length_symbol >= u285);
        if (last_length) {
          break;
        }
        base = lengthBase(length_symbol);
        extra_count = lengthExtra(length_symbol);
        span = ((u1 << extra_count) & MASK);
        upper = ((base + span) & MASK);
        fits = (length_u < upper);
        if (fits) {
          break;
        }
        length_symbol = ((length_symbol + u1) & MASK);
      }
      maximum_length = (length_u === u258);
      if (maximum_length) {
        length_symbol = u285;
      }
      state = Array.from(deflateFixedSymbol(Uint8Array.from(state), length_symbol));
      length_base_value = lengthBase(length_symbol);
      length_extra_count = lengthExtra(length_symbol);
      length_extra_value = ((length_u - length_base_value) & MASK);
      state = Array.from(deflateWriteBits(Uint8Array.from(state), length_extra_value, length_extra_count));
      distance_symbol = u0;
      for (;;) {
        last_distance = (distance_symbol >= u30);
        if (last_distance) {
          break;
        }
        distance_base_value = distanceBase(distance_symbol);
        distance_extra_count = distanceExtra(distance_symbol);
        distance_span = ((u1 << distance_extra_count) & MASK);
        distance_upper = ((distance_base_value + distance_span) & MASK);
        distance_fits = (distance_u < distance_upper);
        if (distance_fits) {
          break;
        }
        distance_symbol = ((distance_symbol + u1) & MASK);
      }
      distance_wire = deflateReverseCode(distance_symbol, u5);
      state = Array.from(deflateWriteBits(Uint8Array.from(state), distance_wire, u5));
      distance_base_final = distanceBase(distance_symbol);
      distance_extra_final = distanceExtra(distance_symbol);
      distance_value = ((distance_u - distance_base_final) & MASK);
      state = Array.from(deflateWriteBits(Uint8Array.from(state), distance_value, distance_extra_final));
    }
    is_literal = (!is_match);
    if (is_literal) {
      literal_at = (pos + i1);
      literal = bget(tokens, literal_at);
      state = Array.from(deflateFixedSymbol(Uint8Array.from(state), literal));
    }
    complete = Array.from(deflateDrainComplete(Uint8Array.from(state)));
    complete_n = blen(complete);
    drain_at = i0;
    for (;;) {
      drain_done = (drain_at >= complete_n);
      if (drain_done) {
        break;
      }
      drain_byte = bget(complete, drain_at);
      out.push(Number(drain_byte & 0xffn));
      drain_at = (drain_at + i1);
    }
    state = Array.from(deflateDrainCarry(Uint8Array.from(state)));
    pos = (pos + i5);
  }
  state = Array.from(deflateFixedSymbol(Uint8Array.from(state), u256));
  state_n = blen(state);
  tail_at = i1;
  for (;;) {
    tail_done = (tail_at >= state_n);
    if (tail_done) {
      break;
    }
    tail_byte = bget(state, tail_at);
    out.push(Number(tail_byte & 0xffn));
    tail_at = (tail_at + i1);
  }
  return Uint8Array.from(out);
}

export function deflateU16Zeros(count: bigint): Uint8Array {
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let out!: number[];
  let width!: bigint;
  let at!: bigint;
  let done!: boolean;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  out = [];
  width = ((count * u2) & MASK);
  at = u0;
  for (;;) {
    done = (at >= width);
    if (done) {
      break;
    }
    out.push(Number(u0 & 0xffn));
    at = ((at + u1) & MASK);
  }
  return Uint8Array.from(out);
}

export function deflateU16Get(data: Uint8Array, index: bigint): bigint {
  let i1!: bigint;
  let u8!: bigint;
  let u2!: bigint;
  let offset_u!: bigint;
  let offset!: bigint;
  let high_at!: bigint;
  let low!: bigint;
  let high!: bigint;
  let shifted!: bigint;
  let value!: bigint;
  i1 = 1n;
  u8 = 8n;
  u2 = 2n;
  offset_u = ((index * u2) & MASK);
  offset = BigInt.asIntN(64, offset_u);
  high_at = (offset + i1);
  low = bget(data, offset);
  high = bget(data, high_at);
  shifted = ((high << u8) & MASK);
  value = (low | shifted);
  return value;
}

export function deflateU16Set(data: Uint8Array, index: bigint, value: bigint): Uint8Array {
  let i1!: bigint;
  let u2!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let i0!: bigint;
  let out!: number[];
  let n!: bigint;
  let copy_at!: bigint;
  let copy_done!: boolean;
  let copy_byte!: bigint;
  let offset_u!: bigint;
  let offset!: bigint;
  let high_at!: bigint;
  let low!: bigint;
  let shifted!: bigint;
  let high!: bigint;
  i1 = 1n;
  u2 = 2n;
  u8 = 8n;
  u255 = 255n;
  i0 = 0n;
  out = [];
  n = blen(data);
  copy_at = i0;
  for (;;) {
    copy_done = (copy_at >= n);
    if (copy_done) {
      break;
    }
    copy_byte = bget(data, copy_at);
    out.push(Number(copy_byte & 0xffn));
    copy_at = (copy_at + i1);
  }
  offset_u = ((index * u2) & MASK);
  offset = BigInt.asIntN(64, offset_u);
  high_at = (offset + i1);
  low = (value & u255);
  shifted = (value >> u8);
  high = (shifted & u255);
  out[Number(offset)] = Number(low & 0xffn);
  out[Number(high_at)] = Number(high & 0xffn);
  return Uint8Array.from(out);
}

export function deflateU16Increment(data: Uint8Array, index: bigint, amount: bigint): Uint8Array {
  let u65535!: bigint;
  let old!: bigint;
  let sum!: bigint;
  let wrapped!: bigint;
  let out!: number[];
  u65535 = 65535n;
  old = deflateU16Get(data, index);
  sum = ((old + amount) & MASK);
  wrapped = (sum & u65535);
  out = Array.from(deflateU16Set(data, index, wrapped));
  return Uint8Array.from(out);
}

export function deflateRecordKeyGet(records: Uint8Array, record: bigint): bigint {
  let u2!: bigint;
  let word!: bigint;
  let key!: bigint;
  u2 = 2n;
  word = ((record * u2) & MASK);
  key = deflateU16Get(records, word);
  return key;
}

export function deflateRecordKeySet(records: Uint8Array, record: bigint, key: bigint): Uint8Array {
  let u2!: bigint;
  let word!: bigint;
  let out!: number[];
  u2 = 2n;
  word = ((record * u2) & MASK);
  out = Array.from(deflateU16Set(records, word, key));
  return Uint8Array.from(out);
}

export function deflateOptimizedLengths(counts: Uint8Array, table_len: bigint, limit: bigint): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let i3!: bigint;
  let i4!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u4!: bigint;
  let u8!: bigint;
  let u33!: bigint;
  let u255!: bigint;
  let u65535!: bigint;
  let used!: number[];
  let used_count!: bigint;
  let symbol!: bigint;
  let done!: boolean;
  let frequency!: bigint;
  let present!: boolean;
  let frequency_low!: bigint;
  let frequency_shifted!: bigint;
  let frequency_high!: bigint;
  let symbol_low!: bigint;
  let symbol_shifted!: bigint;
  let symbol_high!: bigint;
  let used_count_i!: bigint;
  let chosen!: number[];
  let chosen_at!: bigint;
  let chosen_done!: boolean;
  let sorted!: number[];
  let slot!: bigint;
  let sorted_done!: boolean;
  let scan!: bigint;
  let best_index!: bigint;
  let best_frequency!: bigint;
  let have_best!: bigint;
  let scan_done!: boolean;
  let scan_i!: bigint;
  let already!: bigint;
  let unchosen!: boolean;
  let record_u!: bigint;
  let scan_record!: bigint;
  let record_high!: bigint;
  let low!: bigint;
  let high!: bigint;
  let high_shifted!: bigint;
  let first_candidate!: boolean;
  let lower!: boolean;
  let take!: boolean;
  let best_i!: bigint;
  let best_record_u!: bigint;
  let best_record!: bigint;
  let copy_!: bigint;
  let copy_done!: boolean;
  let source!: bigint;
  let byte_!: bigint;
  let one!: boolean;
  let many!: boolean;
  let f0!: bigint;
  let f1!: bigint;
  let initial_sum!: bigint;
  let initial_wrapped!: bigint;
  let root!: bigint;
  let leaf!: bigint;
  let next_!: bigint;
  let last_internal!: bigint;
  let merge_done!: boolean;
  let leaf_end!: boolean;
  let take_root!: boolean;
  let leaf_available!: boolean;
  let root_key!: bigint;
  let leaf_key!: bigint;
  let root_lower!: boolean;
  let take_leaf!: boolean;
  let leaf_end2!: boolean;
  let take_root2!: boolean;
  let leaf_available2!: boolean;
  let root_before_next!: boolean;
  let root_key2!: bigint;
  let leaf_key2!: bigint;
  let root_lower2!: boolean;
  let next_key!: bigint;
  let combined!: bigint;
  let combined_wrapped!: bigint;
  let take_leaf2!: boolean;
  let n_minus2!: bigint;
  let back!: bigint;
  let back_done!: boolean;
  let parent!: bigint;
  let parent_depth!: bigint;
  let depth!: bigint;
  let slots_available!: bigint;
  let used_here!: bigint;
  let root_i!: bigint;
  let next_i!: bigint;
  let assign_done!: boolean;
  let root_negative!: boolean;
  let root_u!: bigint;
  let root_depth!: bigint;
  let different_depth!: boolean;
  let enough!: boolean;
  let next_u!: bigint;
  let num_codes!: number[];
  let count_record!: bigint;
  let count_record_done!: boolean;
  let count_depth!: bigint;
  let over!: bigint;
  let over_sum!: bigint;
  let over_done!: boolean;
  let amount!: bigint;
  let limit_count!: bigint;
  let limit_total!: bigint;
  let total!: bigint;
  let width!: bigint;
  let width_done!: boolean;
  let count!: bigint;
  let shift!: bigint;
  let weighted!: bigint;
  let capacity!: bigint;
  let balanced!: boolean;
  let limit_less!: bigint;
  let seek!: bigint;
  let seek_count!: bigint;
  let found!: boolean;
  let seek_less!: bigint;
  let deeper!: bigint;
  let deeper_count!: bigint;
  let deeper_more!: bigint;
  let lengths!: number[];
  let fill!: bigint;
  let fill_done!: boolean;
  let last!: bigint;
  let length_first!: bigint;
  let length_record!: bigint;
  let length_record_done!: boolean;
  let record_base_u!: bigint;
  let record_base!: bigint;
  let symbol_low_at!: bigint;
  let symbol_high_at!: bigint;
  let symbol_high_shifted!: bigint;
  let symbol_u!: bigint;
  let symbol_i!: bigint;
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  i3 = 3n;
  i4 = 4n;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u4 = 4n;
  u8 = 8n;
  u33 = 33n;
  u255 = 255n;
  u65535 = 65535n;
  used = [];
  used_count = u0;
  symbol = u0;
  for (;;) {
    done = (symbol >= table_len);
    if (done) {
      break;
    }
    frequency = deflateU16Get(counts, symbol);
    present = (frequency !== u0);
    if (present) {
      frequency_low = (frequency & u255);
      frequency_shifted = (frequency >> u8);
      frequency_high = (frequency_shifted & u255);
      symbol_low = (symbol & u255);
      symbol_shifted = (symbol >> u8);
      symbol_high = (symbol_shifted & u255);
      used.push(Number(frequency_low & 0xffn));
      used.push(Number(frequency_high & 0xffn));
      used.push(Number(symbol_low & 0xffn));
      used.push(Number(symbol_high & 0xffn));
      used_count = ((used_count + u1) & MASK);
    }
    symbol = ((symbol + u1) & MASK);
  }
  used_count_i = BigInt.asIntN(64, used_count);
  chosen = [];
  chosen_at = u0;
  for (;;) {
    chosen_done = (chosen_at >= used_count);
    if (chosen_done) {
      break;
    }
    chosen.push(Number(u0 & 0xffn));
    chosen_at = ((chosen_at + u1) & MASK);
  }
  sorted = [];
  slot = u0;
  for (;;) {
    sorted_done = (slot >= used_count);
    if (sorted_done) {
      break;
    }
    scan = u0;
    best_index = u0;
    best_frequency = u65535;
    have_best = u0;
    for (;;) {
      scan_done = (scan >= used_count);
      if (scan_done) {
        break;
      }
      scan_i = BigInt.asIntN(64, scan);
      already = bget(chosen, scan_i);
      unchosen = (already === u0);
      if (unchosen) {
        record_u = ((scan * u4) & MASK);
        scan_record = BigInt.asIntN(64, record_u);
        record_high = (scan_record + i1);
        low = bget(used, scan_record);
        high = bget(used, record_high);
        high_shifted = ((high << u8) & MASK);
        frequency = (low | high_shifted);
        first_candidate = (have_best === u0);
        lower = (frequency < best_frequency);
        take = (first_candidate || lower);
        if (take) {
          best_index = scan;
          best_frequency = frequency;
          have_best = u1;
        }
      }
      scan = ((scan + u1) & MASK);
    }
    best_i = BigInt.asIntN(64, best_index);
    chosen[Number(best_i)] = Number(u1 & 0xffn);
    best_record_u = ((best_index * u4) & MASK);
    best_record = BigInt.asIntN(64, best_record_u);
    copy_ = i0;
    for (;;) {
      copy_done = (copy_ >= i4);
      if (copy_done) {
        break;
      }
      source = (best_record + copy_);
      byte_ = bget(used, source);
      sorted.push(Number(byte_ & 0xffn));
      copy_ = (copy_ + i1);
    }
    slot = ((slot + u1) & MASK);
  }
  one = (used_count === u1);
  if (one) {
    sorted[Number(i0)] = Number(u1 & 0xffn);
    sorted[Number(i1)] = Number(u0 & 0xffn);
  }
  many = (used_count > u1);
  if (many) {
    f0 = deflateRecordKeyGet(Uint8Array.from(sorted), u0);
    f1 = deflateRecordKeyGet(Uint8Array.from(sorted), u1);
    initial_sum = ((f0 + f1) & MASK);
    initial_wrapped = (initial_sum & u65535);
    sorted = Array.from(deflateRecordKeySet(Uint8Array.from(sorted), u0, initial_wrapped));
    root = u0;
    leaf = u2;
    next_ = u1;
    last_internal = ((used_count - u1) & MASK);
    for (;;) {
      merge_done = (next_ >= last_internal);
      if (merge_done) {
        break;
      }
      leaf_end = (leaf >= used_count);
      take_root = leaf_end;
      leaf_available = (!leaf_end);
      if (leaf_available) {
        root_key = deflateRecordKeyGet(Uint8Array.from(sorted), root);
        leaf_key = deflateRecordKeyGet(Uint8Array.from(sorted), leaf);
        root_lower = (root_key < leaf_key);
        take_root = root_lower;
      }
      if (take_root) {
        root_key = deflateRecordKeyGet(Uint8Array.from(sorted), root);
        sorted = Array.from(deflateRecordKeySet(Uint8Array.from(sorted), next_, root_key));
        sorted = Array.from(deflateRecordKeySet(Uint8Array.from(sorted), root, next_));
        root = ((root + u1) & MASK);
      }
      take_leaf = (!take_root);
      if (take_leaf) {
        leaf_key = deflateRecordKeyGet(Uint8Array.from(sorted), leaf);
        sorted = Array.from(deflateRecordKeySet(Uint8Array.from(sorted), next_, leaf_key));
        leaf = ((leaf + u1) & MASK);
      }
      leaf_end2 = (leaf >= used_count);
      take_root2 = leaf_end2;
      leaf_available2 = (!leaf_end2);
      if (leaf_available2) {
        root_before_next = (root < next_);
        if (root_before_next) {
          root_key2 = deflateRecordKeyGet(Uint8Array.from(sorted), root);
          leaf_key2 = deflateRecordKeyGet(Uint8Array.from(sorted), leaf);
          root_lower2 = (root_key2 < leaf_key2);
          take_root2 = root_lower2;
        }
      }
      next_key = deflateRecordKeyGet(Uint8Array.from(sorted), next_);
      if (take_root2) {
        root_key2 = deflateRecordKeyGet(Uint8Array.from(sorted), root);
        combined = ((next_key + root_key2) & MASK);
        combined_wrapped = (combined & u65535);
        sorted = Array.from(deflateRecordKeySet(Uint8Array.from(sorted), next_, combined_wrapped));
        sorted = Array.from(deflateRecordKeySet(Uint8Array.from(sorted), root, next_));
        root = ((root + u1) & MASK);
      }
      take_leaf2 = (!take_root2);
      if (take_leaf2) {
        leaf_key2 = deflateRecordKeyGet(Uint8Array.from(sorted), leaf);
        combined = ((next_key + leaf_key2) & MASK);
        combined_wrapped = (combined & u65535);
        sorted = Array.from(deflateRecordKeySet(Uint8Array.from(sorted), next_, combined_wrapped));
        leaf = ((leaf + u1) & MASK);
      }
      next_ = ((next_ + u1) & MASK);
    }
    n_minus2 = ((used_count - u2) & MASK);
    sorted = Array.from(deflateRecordKeySet(Uint8Array.from(sorted), n_minus2, u0));
    back = n_minus2;
    for (;;) {
      back_done = (back === u0);
      if (back_done) {
        break;
      }
      back = ((back - u1) & MASK);
      parent = deflateRecordKeyGet(Uint8Array.from(sorted), back);
      parent_depth = deflateRecordKeyGet(Uint8Array.from(sorted), parent);
      depth = ((parent_depth + u1) & MASK);
      sorted = Array.from(deflateRecordKeySet(Uint8Array.from(sorted), back, depth));
    }
    slots_available = u1;
    used_here = u0;
    depth = u0;
    root_i = BigInt.asIntN(64, n_minus2);
    next_i = (used_count_i - i1);
    for (;;) {
      assign_done = (slots_available === u0);
      if (assign_done) {
        break;
      }
      for (;;) {
        root_negative = (root_i < i0);
        if (root_negative) {
          break;
        }
        root_u = (root_i & MASK);
        root_depth = deflateRecordKeyGet(Uint8Array.from(sorted), root_u);
        different_depth = (root_depth !== depth);
        if (different_depth) {
          break;
        }
        used_here = ((used_here + u1) & MASK);
        root_i = (root_i - i1);
      }
      for (;;) {
        enough = (slots_available <= used_here);
        if (enough) {
          break;
        }
        next_u = (next_i & MASK);
        sorted = Array.from(deflateRecordKeySet(Uint8Array.from(sorted), next_u, depth));
        next_i = (next_i - i1);
        slots_available = ((slots_available - u1) & MASK);
      }
      slots_available = ((used_here * u2) & MASK);
      depth = ((depth + u1) & MASK);
      used_here = u0;
    }
  }
  num_codes = Array.from(deflateU16Zeros(u33));
  count_record = u0;
  for (;;) {
    count_record_done = (count_record >= used_count);
    if (count_record_done) {
      break;
    }
    count_depth = deflateRecordKeyGet(Uint8Array.from(sorted), count_record);
    num_codes = Array.from(deflateU16Increment(Uint8Array.from(num_codes), count_depth, u1));
    count_record = ((count_record + u1) & MASK);
  }
  over = ((limit + u1) & MASK);
  over_sum = u0;
  for (;;) {
    over_done = (over >= u33);
    if (over_done) {
      break;
    }
    amount = deflateU16Get(Uint8Array.from(num_codes), over);
    over_sum = ((over_sum + amount) & MASK);
    over = ((over + u1) & MASK);
  }
  limit_count = deflateU16Get(Uint8Array.from(num_codes), limit);
  limit_total = ((limit_count + over_sum) & MASK);
  num_codes = Array.from(deflateU16Set(Uint8Array.from(num_codes), limit, limit_total));
  total = u0;
  width = u1;
  for (;;) {
    width_done = (width > limit);
    if (width_done) {
      break;
    }
    count = deflateU16Get(Uint8Array.from(num_codes), width);
    shift = ((limit - width) & MASK);
    weighted = ((count << shift) & MASK);
    total = ((total + weighted) & MASK);
    width = ((width + u1) & MASK);
  }
  capacity = ((u1 << limit) & MASK);
  for (;;) {
    balanced = (total <= capacity);
    if (balanced) {
      break;
    }
    limit_count = deflateU16Get(Uint8Array.from(num_codes), limit);
    limit_less = ((limit_count - u1) & MASK);
    num_codes = Array.from(deflateU16Set(Uint8Array.from(num_codes), limit, limit_less));
    seek = ((limit - u1) & MASK);
    for (;;) {
      seek_count = deflateU16Get(Uint8Array.from(num_codes), seek);
      found = (seek_count !== u0);
      if (found) {
        seek_less = ((seek_count - u1) & MASK);
        num_codes = Array.from(deflateU16Set(Uint8Array.from(num_codes), seek, seek_less));
        deeper = ((seek + u1) & MASK);
        deeper_count = deflateU16Get(Uint8Array.from(num_codes), deeper);
        deeper_more = ((deeper_count + u2) & MASK);
        num_codes = Array.from(deflateU16Set(Uint8Array.from(num_codes), deeper, deeper_more));
        break;
      }
      seek = ((seek - u1) & MASK);
    }
    total = ((total - u1) & MASK);
  }
  lengths = [];
  fill = u0;
  for (;;) {
    fill_done = (fill >= table_len);
    if (fill_done) {
      break;
    }
    lengths.push(Number(u0 & 0xffn));
    fill = ((fill + u1) & MASK);
  }
  last = used_count;
  width = u1;
  for (;;) {
    width_done = (width > limit);
    if (width_done) {
      break;
    }
    amount = deflateU16Get(Uint8Array.from(num_codes), width);
    length_first = ((last - amount) & MASK);
    length_record = length_first;
    for (;;) {
      length_record_done = (length_record >= last);
      if (length_record_done) {
        break;
      }
      record_base_u = ((length_record * u4) & MASK);
      record_base = BigInt.asIntN(64, record_base_u);
      symbol_low_at = (record_base + i2);
      symbol_high_at = (record_base + i3);
      symbol_low = bget(sorted, symbol_low_at);
      symbol_high = bget(sorted, symbol_high_at);
      symbol_high_shifted = ((symbol_high << u8) & MASK);
      symbol_u = (symbol_low | symbol_high_shifted);
      symbol_i = BigInt.asIntN(64, symbol_u);
      lengths[Number(symbol_i)] = Number(width & 0xffn);
      length_record = ((length_record + u1) & MASK);
    }
    last = length_first;
    width = ((width + u1) & MASK);
  }
  return Uint8Array.from(lengths);
}

export function deflateCanonicalCodes(lengths: Uint8Array, max_bits: bigint): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let counts!: number[];
  let counts_head!: number[];
  let n!: bigint;
  let at!: bigint;
  let count_done!: boolean;
  let width!: bigint;
  let coded!: boolean;
  let next_count!: bigint;
  let next_!: number[];
  let code!: bigint;
  let next_done!: boolean;
  let previous!: bigint;
  let previous_count!: bigint;
  let sum!: bigint;
  let n_u!: bigint;
  let codes!: number[];
  let symbol!: bigint;
  let codes_done!: boolean;
  let canonical!: bigint;
  let wire!: bigint;
  let symbol_u!: bigint;
  let canonical_next!: bigint;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  counts = Array.from(deflateU16Zeros(max_bits));
  counts_head = [];
  counts_head.push(Number(u0 & 0xffn));
  counts_head.push(Number(u0 & 0xffn));
  counts = Array.from(appendBytes(Uint8Array.from(counts_head), Uint8Array.from(counts)));
  n = blen(lengths);
  at = i0;
  for (;;) {
    count_done = (at >= n);
    if (count_done) {
      break;
    }
    width = bget(lengths, at);
    coded = (width !== u0);
    if (coded) {
      counts = Array.from(deflateU16Increment(Uint8Array.from(counts), width, u1));
    }
    at = (at + i1);
  }
  next_count = ((max_bits + u1) & MASK);
  next_ = Array.from(deflateU16Zeros(next_count));
  code = u0;
  width = 2n;
  for (;;) {
    next_done = (width > max_bits);
    if (next_done) {
      break;
    }
    previous = ((width - u1) & MASK);
    previous_count = deflateU16Get(Uint8Array.from(counts), previous);
    sum = ((code + previous_count) & MASK);
    code = ((sum << u1) & MASK);
    next_ = Array.from(deflateU16Set(Uint8Array.from(next_), width, code));
    width = ((width + u1) & MASK);
  }
  n_u = (n & MASK);
  codes = Array.from(deflateU16Zeros(n_u));
  symbol = i0;
  for (;;) {
    codes_done = (symbol >= n);
    if (codes_done) {
      break;
    }
    width = bget(lengths, symbol);
    coded = (width !== u0);
    if (coded) {
      canonical = deflateU16Get(Uint8Array.from(next_), width);
      wire = deflateReverseCode(canonical, width);
      symbol_u = (symbol & MASK);
      codes = Array.from(deflateU16Set(Uint8Array.from(codes), symbol_u, wire));
      canonical_next = ((canonical + u1) & MASK);
      next_ = Array.from(deflateU16Set(Uint8Array.from(next_), width, canonical_next));
    }
    symbol = (symbol + i1);
  }
  return Uint8Array.from(codes);
}

export function deflatePackCodeLengths(lengths: Uint8Array): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u3!: bigint;
  let u6!: bigint;
  let u10!: bigint;
  let u11!: bigint;
  let u16!: bigint;
  let u17!: bigint;
  let u18!: bigint;
  let u19!: bigint;
  let u138!: bigint;
  let counts!: number[];
  let packed_!: number[];
  let n!: bigint;
  let at!: bigint;
  let done!: boolean;
  let width!: bigint;
  let zero!: boolean;
  let run!: bigint;
  let scan!: bigint;
  let scan_end!: boolean;
  let run_full!: boolean;
  let stop!: boolean;
  let next_width!: bigint;
  let different!: boolean;
  let short_!: boolean;
  let left!: bigint;
  let emitted!: boolean;
  let not_short!: boolean;
  let medium!: boolean;
  let extra!: bigint;
  let long_!: boolean;
  let run_i!: bigint;
  let nonzero!: boolean;
  let repeat!: bigint;
  let repeat_done!: boolean;
  let chunk_full!: boolean;
  let repeat_short!: boolean;
  let repeat_long!: boolean;
  let out!: number[];
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  u3 = 3n;
  u6 = 6n;
  u10 = 10n;
  u11 = 11n;
  u16 = 16n;
  u17 = 17n;
  u18 = 18n;
  u19 = 19n;
  u138 = 138n;
  counts = Array.from(deflateU16Zeros(u19));
  packed_ = [];
  n = blen(lengths);
  at = i0;
  for (;;) {
    done = (at >= n);
    if (done) {
      break;
    }
    width = bget(lengths, at);
    zero = (width === u0);
    if (zero) {
      run = u1;
      scan = (at + i1);
      for (;;) {
        scan_end = (scan >= n);
        run_full = (run >= u138);
        stop = (scan_end || run_full);
        if (stop) {
          break;
        }
        next_width = bget(lengths, scan);
        different = (next_width !== u0);
        if (different) {
          break;
        }
        run = ((run + u1) & MASK);
        scan = (scan + i1);
      }
      short_ = (run < u3);
      if (short_) {
        left = run;
        for (;;) {
          emitted = (left === u0);
          if (emitted) {
            break;
          }
          packed_.push(Number(u0 & 0xffn));
          counts = Array.from(deflateU16Increment(Uint8Array.from(counts), u0, u1));
          left = ((left - u1) & MASK);
        }
      }
      not_short = (!short_);
      if (not_short) {
        medium = (run <= u10);
        if (medium) {
          packed_.push(Number(u17 & 0xffn));
          extra = ((run - u3) & MASK);
          packed_.push(Number(extra & 0xffn));
          counts = Array.from(deflateU16Increment(Uint8Array.from(counts), u17, u1));
        }
        long_ = (!medium);
        if (long_) {
          packed_.push(Number(u18 & 0xffn));
          extra = ((run - u11) & MASK);
          packed_.push(Number(extra & 0xffn));
          counts = Array.from(deflateU16Increment(Uint8Array.from(counts), u18, u1));
        }
      }
      run_i = BigInt.asIntN(64, run);
      at = (at + run_i);
    }
    nonzero = (!zero);
    if (nonzero) {
      packed_.push(Number(width & 0xffn));
      counts = Array.from(deflateU16Increment(Uint8Array.from(counts), width, u1));
      at = (at + i1);
      repeat = u0;
      for (;;) {
        repeat_done = (at >= n);
        if (repeat_done) {
          break;
        }
        next_width = bget(lengths, at);
        different = (next_width !== width);
        if (different) {
          break;
        }
        repeat = ((repeat + u1) & MASK);
        at = (at + i1);
        chunk_full = (repeat === u6);
        if (chunk_full) {
          packed_.push(Number(u16 & 0xffn));
          extra = ((repeat - u3) & MASK);
          packed_.push(Number(extra & 0xffn));
          counts = Array.from(deflateU16Increment(Uint8Array.from(counts), u16, u1));
          repeat = u0;
        }
      }
      repeat_short = (repeat < u3);
      if (repeat_short) {
        left = repeat;
        for (;;) {
          emitted = (left === u0);
          if (emitted) {
            break;
          }
          packed_.push(Number(width & 0xffn));
          counts = Array.from(deflateU16Increment(Uint8Array.from(counts), width, u1));
          left = ((left - u1) & MASK);
        }
      }
      repeat_long = (repeat >= u3);
      if (repeat_long) {
        packed_.push(Number(u16 & 0xffn));
        extra = ((repeat - u3) & MASK);
        packed_.push(Number(extra & 0xffn));
        counts = Array.from(deflateU16Increment(Uint8Array.from(counts), u16, u1));
      }
    }
  }
  out = Array.from(appendBytes(Uint8Array.from(counts), Uint8Array.from(packed_)));
  return Uint8Array.from(out);
}

export function deflateHuffmanSymbol(state: Uint8Array, codes: Uint8Array, lengths: Uint8Array, symbol: bigint): Uint8Array {
  let symbol_i!: bigint;
  let width!: bigint;
  let code!: bigint;
  let out!: number[];
  symbol_i = BigInt.asIntN(64, symbol);
  width = bget(lengths, symbol_i);
  code = deflateU16Get(codes, symbol);
  out = Array.from(deflateWriteBits(state, code, width));
  return Uint8Array.from(out);
}

export function deflateMatchSymbols(length: bigint, distance: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let u30!: bigint;
  let u32!: bigint;
  let u257!: bigint;
  let u258!: bigint;
  let u285!: bigint;
  let length_symbol!: bigint;
  let last_length!: boolean;
  let base!: bigint;
  let extra_count!: bigint;
  let span!: bigint;
  let upper!: bigint;
  let fits!: boolean;
  let maximum_length!: boolean;
  let distance_symbol!: bigint;
  let last_distance!: boolean;
  let length_high!: bigint;
  let packed_!: bigint;
  u0 = 0n;
  u1 = 1n;
  u30 = 30n;
  u32 = 32n;
  u257 = 257n;
  u258 = 258n;
  u285 = 285n;
  length_symbol = u257;
  for (;;) {
    last_length = (length_symbol >= u285);
    if (last_length) {
      break;
    }
    base = lengthBase(length_symbol);
    extra_count = lengthExtra(length_symbol);
    span = ((u1 << extra_count) & MASK);
    upper = ((base + span) & MASK);
    fits = (length < upper);
    if (fits) {
      break;
    }
    length_symbol = ((length_symbol + u1) & MASK);
  }
  maximum_length = (length === u258);
  if (maximum_length) {
    length_symbol = u285;
  }
  distance_symbol = u0;
  for (;;) {
    last_distance = (distance_symbol >= u30);
    if (last_distance) {
      break;
    }
    base = distanceBase(distance_symbol);
    extra_count = distanceExtra(distance_symbol);
    span = ((u1 << extra_count) & MASK);
    upper = ((base + span) & MASK);
    fits = (distance < upper);
    if (fits) {
      break;
    }
    distance_symbol = ((distance_symbol + u1) & MASK);
  }
  length_high = ((length_symbol << u32) & MASK);
  packed_ = (length_high | distance_symbol);
  return packed_;
}

export function deflateDynamic(data: Uint8Array): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let i3!: bigint;
  let i4!: bigint;
  let i5!: bigint;
  let i38!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u4!: bigint;
  let u5!: bigint;
  let u7!: bigint;
  let u8!: bigint;
  let u15!: bigint;
  let u16!: bigint;
  let u19!: bigint;
  let u30!: bigint;
  let u32!: bigint;
  let u256!: bigint;
  let u257!: bigint;
  let u286!: bigint;
  let u288!: bigint;
  let u4294967295!: bigint;
  let tokens!: number[];
  let lit_counts!: number[];
  let dist_counts!: number[];
  let tokens_n!: bigint;
  let token_at!: bigint;
  let count_done!: boolean;
  let tag!: bigint;
  let match_!: boolean;
  let value_low_at!: bigint;
  let value_high_at!: bigint;
  let distance_low_at!: bigint;
  let distance_high_at!: bigint;
  let value_low!: bigint;
  let value_high!: bigint;
  let value_high_shifted!: bigint;
  let length!: bigint;
  let distance_low!: bigint;
  let distance_high!: bigint;
  let distance_high_shifted!: bigint;
  let distance!: bigint;
  let symbols!: bigint;
  let length_symbol!: bigint;
  let distance_symbol!: bigint;
  let literal!: boolean;
  let literal_at!: bigint;
  let literal_symbol!: bigint;
  let lit_lengths!: number[];
  let dist_lengths!: number[];
  let lit_codes!: number[];
  let dist_codes!: number[];
  let num_lit!: bigint;
  let minimum_lit!: boolean;
  let last_lit!: bigint;
  let last_lit_i!: bigint;
  let last_width!: bigint;
  let used_lit!: boolean;
  let num_dist!: bigint;
  let minimum_dist!: boolean;
  let last_dist!: bigint;
  let last_dist_i!: bigint;
  let used_dist!: boolean;
  let num_lit_i!: bigint;
  let num_dist_i!: bigint;
  let packed_lit_lengths!: number[];
  let packed_dist_lengths!: number[];
  let sizes!: number[];
  let packed_bundle!: number[];
  let bundle_n!: bigint;
  let cl_counts!: number[];
  let packed_!: number[];
  let cl_lengths!: number[];
  let cl_codes!: number[];
  let order!: number[];
  let num_bit_lengths!: bigint;
  let minimum_cl!: boolean;
  let order_at!: bigint;
  let order_at_i!: bigint;
  let cl_symbol!: bigint;
  let cl_symbol_i!: bigint;
  let cl_width!: bigint;
  let used_cl!: boolean;
  let out!: number[];
  let state!: number[];
  let hlit!: bigint;
  let hdist!: bigint;
  let hclen!: bigint;
  let order_done!: boolean;
  let packed_n!: bigint;
  let packed_at!: bigint;
  let packed_done!: boolean;
  let has_extra!: boolean;
  let extra!: bigint;
  let extra_index!: bigint;
  let extra_width!: bigint;
  let is17!: boolean;
  let is18!: boolean;
  let emit_done!: boolean;
  let length_base_value!: bigint;
  let length_extra_width!: bigint;
  let length_extra_value!: bigint;
  let distance_base_value!: bigint;
  let distance_extra_width!: bigint;
  let distance_extra_value!: bigint;
  let complete!: number[];
  let complete_n!: bigint;
  let drain_at!: bigint;
  let drain_done!: boolean;
  let drain_byte!: bigint;
  let state_n!: bigint;
  let tail_at!: bigint;
  let tail_done!: boolean;
  let tail_byte!: bigint;
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  i3 = 3n;
  i4 = 4n;
  i5 = 5n;
  i38 = 38n;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u4 = 4n;
  u5 = 5n;
  u7 = 7n;
  u8 = 8n;
  u15 = 15n;
  u16 = 16n;
  u19 = 19n;
  u30 = 30n;
  u32 = 32n;
  u256 = 256n;
  u257 = 257n;
  u286 = 286n;
  u288 = 288n;
  u4294967295 = 4294967295n;
  tokens = Array.from(deflateTokens(data));
  lit_counts = Array.from(deflateU16Zeros(u288));
  dist_counts = Array.from(deflateU16Zeros(u32));
  tokens_n = blen(tokens);
  token_at = i0;
  for (;;) {
    count_done = (token_at >= tokens_n);
    if (count_done) {
      break;
    }
    tag = bget(tokens, token_at);
    match_ = (tag === u1);
    if (match_) {
      value_low_at = (token_at + i1);
      value_high_at = (token_at + i2);
      distance_low_at = (token_at + i3);
      distance_high_at = (token_at + i4);
      value_low = bget(tokens, value_low_at);
      value_high = bget(tokens, value_high_at);
      value_high_shifted = ((value_high << u8) & MASK);
      length = (value_low | value_high_shifted);
      distance_low = bget(tokens, distance_low_at);
      distance_high = bget(tokens, distance_high_at);
      distance_high_shifted = ((distance_high << u8) & MASK);
      distance = (distance_low | distance_high_shifted);
      symbols = deflateMatchSymbols(length, distance);
      length_symbol = (symbols >> u32);
      distance_symbol = (symbols & u4294967295);
      lit_counts = Array.from(deflateU16Increment(Uint8Array.from(lit_counts), length_symbol, u1));
      dist_counts = Array.from(deflateU16Increment(Uint8Array.from(dist_counts), distance_symbol, u1));
    }
    literal = (!match_);
    if (literal) {
      literal_at = (token_at + i1);
      literal_symbol = bget(tokens, literal_at);
      lit_counts = Array.from(deflateU16Increment(Uint8Array.from(lit_counts), literal_symbol, u1));
    }
    token_at = (token_at + i5);
  }
  lit_counts = Array.from(deflateU16Set(Uint8Array.from(lit_counts), u256, u1));
  lit_lengths = Array.from(deflateOptimizedLengths(Uint8Array.from(lit_counts), u288, u15));
  dist_lengths = Array.from(deflateOptimizedLengths(Uint8Array.from(dist_counts), u32, u15));
  lit_codes = Array.from(deflateCanonicalCodes(Uint8Array.from(lit_lengths), u15));
  dist_codes = Array.from(deflateCanonicalCodes(Uint8Array.from(dist_lengths), u15));
  num_lit = u286;
  for (;;) {
    minimum_lit = (num_lit <= u257);
    if (minimum_lit) {
      break;
    }
    last_lit = ((num_lit - u1) & MASK);
    last_lit_i = BigInt.asIntN(64, last_lit);
    last_width = bget(lit_lengths, last_lit_i);
    used_lit = (last_width !== u0);
    if (used_lit) {
      break;
    }
    num_lit = last_lit;
  }
  num_dist = u30;
  for (;;) {
    minimum_dist = (num_dist <= u1);
    if (minimum_dist) {
      break;
    }
    last_dist = ((num_dist - u1) & MASK);
    last_dist_i = BigInt.asIntN(64, last_dist);
    last_width = bget(dist_lengths, last_dist_i);
    used_dist = (last_width !== u0);
    if (used_dist) {
      break;
    }
    num_dist = last_dist;
  }
  num_lit_i = BigInt.asIntN(64, num_lit);
  num_dist_i = BigInt.asIntN(64, num_dist);
  packed_lit_lengths = bslice(lit_lengths, i0, num_lit_i);
  packed_dist_lengths = bslice(dist_lengths, i0, num_dist_i);
  sizes = Array.from(appendBytes(Uint8Array.from(packed_lit_lengths), Uint8Array.from(packed_dist_lengths)));
  packed_bundle = Array.from(deflatePackCodeLengths(Uint8Array.from(sizes)));
  bundle_n = blen(packed_bundle);
  cl_counts = bslice(packed_bundle, i0, i38);
  packed_ = bslice(packed_bundle, i38, bundle_n);
  cl_lengths = Array.from(deflateOptimizedLengths(Uint8Array.from(cl_counts), u19, u7));
  cl_codes = Array.from(deflateCanonicalCodes(Uint8Array.from(cl_lengths), u7));
  order = Array.from(codeLengthOrder());
  num_bit_lengths = u19;
  for (;;) {
    minimum_cl = (num_bit_lengths <= u4);
    if (minimum_cl) {
      break;
    }
    order_at = ((num_bit_lengths - u1) & MASK);
    order_at_i = BigInt.asIntN(64, order_at);
    cl_symbol = bget(order, order_at_i);
    cl_symbol_i = BigInt.asIntN(64, cl_symbol);
    cl_width = bget(cl_lengths, cl_symbol_i);
    used_cl = (cl_width !== u0);
    if (used_cl) {
      break;
    }
    num_bit_lengths = order_at;
  }
  out = [];
  state = [];
  state.push(Number(u0 & 0xffn));
  state = Array.from(deflateWriteBits(Uint8Array.from(state), u5, u3));
  hlit = ((num_lit - u257) & MASK);
  hdist = ((num_dist - u1) & MASK);
  hclen = ((num_bit_lengths - u4) & MASK);
  state = Array.from(deflateWriteBits(Uint8Array.from(state), hlit, u5));
  state = Array.from(deflateWriteBits(Uint8Array.from(state), hdist, u5));
  state = Array.from(deflateWriteBits(Uint8Array.from(state), hclen, u4));
  order_at = u0;
  for (;;) {
    order_done = (order_at >= num_bit_lengths);
    if (order_done) {
      break;
    }
    order_at_i = BigInt.asIntN(64, order_at);
    cl_symbol = bget(order, order_at_i);
    cl_symbol_i = BigInt.asIntN(64, cl_symbol);
    cl_width = bget(cl_lengths, cl_symbol_i);
    state = Array.from(deflateWriteBits(Uint8Array.from(state), cl_width, u3));
    order_at = ((order_at + u1) & MASK);
  }
  packed_n = blen(packed_);
  packed_at = i0;
  for (;;) {
    packed_done = (packed_at >= packed_n);
    if (packed_done) {
      break;
    }
    cl_symbol = bget(packed_, packed_at);
    state = Array.from(deflateHuffmanSymbol(Uint8Array.from(state), Uint8Array.from(cl_codes), Uint8Array.from(cl_lengths), cl_symbol));
    packed_at = (packed_at + i1);
    has_extra = (cl_symbol >= u16);
    if (has_extra) {
      extra = bget(packed_, packed_at);
      extra_index = ((cl_symbol - u16) & MASK);
      extra_width = u2;
      is17 = (extra_index === u1);
      if (is17) {
        extra_width = u3;
      }
      is18 = (extra_index === u2);
      if (is18) {
        extra_width = u7;
      }
      state = Array.from(deflateWriteBits(Uint8Array.from(state), extra, extra_width));
      packed_at = (packed_at + i1);
    }
  }
  token_at = i0;
  for (;;) {
    emit_done = (token_at >= tokens_n);
    if (emit_done) {
      break;
    }
    tag = bget(tokens, token_at);
    match_ = (tag === u1);
    if (match_) {
      value_low_at = (token_at + i1);
      value_high_at = (token_at + i2);
      distance_low_at = (token_at + i3);
      distance_high_at = (token_at + i4);
      value_low = bget(tokens, value_low_at);
      value_high = bget(tokens, value_high_at);
      value_high_shifted = ((value_high << u8) & MASK);
      length = (value_low | value_high_shifted);
      distance_low = bget(tokens, distance_low_at);
      distance_high = bget(tokens, distance_high_at);
      distance_high_shifted = ((distance_high << u8) & MASK);
      distance = (distance_low | distance_high_shifted);
      symbols = deflateMatchSymbols(length, distance);
      length_symbol = (symbols >> u32);
      distance_symbol = (symbols & u4294967295);
      state = Array.from(deflateHuffmanSymbol(Uint8Array.from(state), Uint8Array.from(lit_codes), Uint8Array.from(lit_lengths), length_symbol));
      length_base_value = lengthBase(length_symbol);
      length_extra_width = lengthExtra(length_symbol);
      length_extra_value = ((length - length_base_value) & MASK);
      state = Array.from(deflateWriteBits(Uint8Array.from(state), length_extra_value, length_extra_width));
      state = Array.from(deflateHuffmanSymbol(Uint8Array.from(state), Uint8Array.from(dist_codes), Uint8Array.from(dist_lengths), distance_symbol));
      distance_base_value = distanceBase(distance_symbol);
      distance_extra_width = distanceExtra(distance_symbol);
      distance_extra_value = ((distance - distance_base_value) & MASK);
      state = Array.from(deflateWriteBits(Uint8Array.from(state), distance_extra_value, distance_extra_width));
    }
    literal = (!match_);
    if (literal) {
      literal_at = (token_at + i1);
      literal_symbol = bget(tokens, literal_at);
      state = Array.from(deflateHuffmanSymbol(Uint8Array.from(state), Uint8Array.from(lit_codes), Uint8Array.from(lit_lengths), literal_symbol));
    }
    complete = Array.from(deflateDrainComplete(Uint8Array.from(state)));
    complete_n = blen(complete);
    drain_at = i0;
    for (;;) {
      drain_done = (drain_at >= complete_n);
      if (drain_done) {
        break;
      }
      drain_byte = bget(complete, drain_at);
      out.push(Number(drain_byte & 0xffn));
      drain_at = (drain_at + i1);
    }
    state = Array.from(deflateDrainCarry(Uint8Array.from(state)));
    token_at = (token_at + i5);
  }
  state = Array.from(deflateHuffmanSymbol(Uint8Array.from(state), Uint8Array.from(lit_codes), Uint8Array.from(lit_lengths), u256));
  state_n = blen(state);
  tail_at = i1;
  for (;;) {
    tail_done = (tail_at >= state_n);
    if (tail_done) {
      break;
    }
    tail_byte = bget(state, tail_at);
    out.push(Number(tail_byte & 0xffn));
    tail_at = (tail_at + i1);
  }
  return Uint8Array.from(out);
}

export function deflateStored(data: Uint8Array): Uint8Array {
  let u1!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let u65535!: bigint;
  let head!: number[];
  let n_i!: bigint;
  let n!: bigint;
  let n_low!: bigint;
  let n_shifted!: bigint;
  let n_high!: bigint;
  let complement!: bigint;
  let complement_low!: bigint;
  let complement_shifted!: bigint;
  let complement_high!: bigint;
  let out!: number[];
  u1 = 1n;
  u8 = 8n;
  u255 = 255n;
  u65535 = 65535n;
  head = [];
  head.push(Number(u1 & 0xffn));
  n_i = blen(data);
  n = (n_i & MASK);
  n_low = (n & u255);
  n_shifted = (n >> u8);
  n_high = (n_shifted & u255);
  complement = ((u65535 - n) & MASK);
  complement_low = (complement & u255);
  complement_shifted = (complement >> u8);
  complement_high = (complement_shifted & u255);
  head.push(Number(n_low & 0xffn));
  head.push(Number(n_high & 0xffn));
  head.push(Number(complement_low & 0xffn));
  head.push(Number(complement_high & 0xffn));
  out = Array.from(appendBytes(Uint8Array.from(head), data));
  return Uint8Array.from(out);
}

export function deflateMinizLevel6(data: Uint8Array): Uint8Array {
  let i0!: bigint;
  let i32!: bigint;
  let i48!: bigint;
  let i65535!: bigint;
  let n!: bigint;
  let body!: number[];
  let fixed!: boolean;
  let dynamic!: boolean;
  let body_n!: bigint;
  let large!: boolean;
  let expanded!: boolean;
  let fits_stored!: boolean;
  let fallback_candidate!: boolean;
  let fallback!: boolean;
  i0 = 0n;
  i32 = 32n;
  i48 = 48n;
  i65535 = 65535n;
  n = blen(data);
  body = bslice(data, i0, i0);
  fixed = (n < i48);
  if (fixed) {
    body = Array.from(deflateFixed(data));
  }
  dynamic = (n >= i48);
  if (dynamic) {
    body = Array.from(deflateDynamic(data));
  }
  body_n = blen(body);
  large = (n > i32);
  expanded = (body_n >= n);
  fits_stored = (n <= i65535);
  fallback_candidate = (large && expanded);
  fallback = (fallback_candidate && fits_stored);
  if (fallback) {
    body = Array.from(deflateStored(data));
  }
  return Uint8Array.from(body);
}

export function zlibCompress(data: Uint8Array): Uint8Array {
  let u8!: bigint;
  let u16!: bigint;
  let u24!: bigint;
  let u120!: bigint;
  let u156!: bigint;
  let u255!: bigint;
  let out!: number[];
  let body!: number[];
  let prefixed!: number[];
  let checksum!: bigint;
  let b3_shifted!: bigint;
  let b3!: bigint;
  let b2_shifted!: bigint;
  let b2!: bigint;
  let b1_shifted!: bigint;
  let b1!: bigint;
  let b0!: bigint;
  let trailer!: number[];
  let complete!: number[];
  u8 = 8n;
  u16 = 16n;
  u24 = 24n;
  u120 = 120n;
  u156 = 156n;
  u255 = 255n;
  out = [];
  out.push(Number(u120 & 0xffn));
  out.push(Number(u156 & 0xffn));
  body = Array.from(deflateMinizLevel6(data));
  prefixed = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(body)));
  checksum = adler32(data);
  b3_shifted = (checksum >> u24);
  b3 = (b3_shifted & u255);
  b2_shifted = (checksum >> u16);
  b2 = (b2_shifted & u255);
  b1_shifted = (checksum >> u8);
  b1 = (b1_shifted & u255);
  b0 = (checksum & u255);
  trailer = [];
  trailer.push(Number(b3 & 0xffn));
  trailer.push(Number(b2 & 0xffn));
  trailer.push(Number(b1 & 0xffn));
  trailer.push(Number(b0 & 0xffn));
  complete = Array.from(appendBytes(Uint8Array.from(prefixed), Uint8Array.from(trailer)));
  return Uint8Array.from(complete);
}

export function appendBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  let out!: number[];
  let i0!: bigint;
  let i1!: bigint;
  let left_n!: bigint;
  let right_n!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  out = [];
  i0 = 0n;
  i1 = 1n;
  left_n = blen(left);
  right_n = blen(right);
  pos = i0;
  for (;;) {
    done = (pos >= left_n);
    if (done) {
      break;
    }
    byte_ = bget(left, pos);
    out.push(Number(byte_ & 0xffn));
    pos = (pos + i1);
  }
  pos = i0;
  for (;;) {
    done = (pos >= right_n);
    if (done) {
      break;
    }
    byte_ = bget(right, pos);
    out.push(Number(byte_ & 0xffn));
    pos = (pos + i1);
  }
  return Uint8Array.from(out);
}

export function u32ToLe(value: bigint): Uint8Array {
  let out!: number[];
  let u8!: bigint;
  let u255!: bigint;
  let u4!: bigint;
  let pos!: bigint;
  let remaining!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let one!: bigint;
  out = [];
  u8 = 8n;
  u255 = 255n;
  u4 = 4n;
  pos = 0n;
  remaining = value;
  for (;;) {
    done = (pos >= u4);
    if (done) {
      break;
    }
    byte_ = (remaining & u255);
    out.push(Number(byte_ & 0xffn));
    remaining = (remaining >> u8);
    one = 1n;
    pos = ((pos + one) & MASK);
  }
  return Uint8Array.from(out);
}

export function u64ToLe(value: bigint): Uint8Array {
  let out!: number[];
  let u8!: bigint;
  let u255!: bigint;
  let count!: bigint;
  let pos!: bigint;
  let remaining!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let one!: bigint;
  out = [];
  u8 = 8n;
  u255 = 255n;
  count = 8n;
  pos = 0n;
  remaining = value;
  for (;;) {
    done = (pos >= count);
    if (done) {
      break;
    }
    byte_ = (remaining & u255);
    out.push(Number(byte_ & 0xffn));
    remaining = (remaining >> u8);
    one = 1n;
    pos = ((pos + one) & MASK);
  }
  return Uint8Array.from(out);
}

export function readU32Le(data: Uint8Array, start: bigint): bigint {
  let u0!: bigint;
  let u8!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let i4!: bigint;
  let result!: bigint;
  let shift!: bigint;
  let pos!: bigint;
  let read!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let part!: bigint;
  u0 = 0n;
  u8 = 8n;
  i0 = 0n;
  i1 = 1n;
  i4 = 4n;
  result = u0;
  shift = u0;
  pos = start;
  read = i0;
  for (;;) {
    done = (read >= i4);
    if (done) {
      break;
    }
    byte_ = bget(data, pos);
    part = ((byte_ << shift) & MASK);
    result = (result | part);
    shift = ((shift + u8) & MASK);
    pos = (pos + i1);
    read = (read + i1);
  }
  return result;
}

export function readU64Le(data: Uint8Array, start: bigint): bigint {
  let u0!: bigint;
  let u8!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let i8!: bigint;
  let result!: bigint;
  let shift!: bigint;
  let pos!: bigint;
  let read!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let part!: bigint;
  u0 = 0n;
  u8 = 8n;
  i0 = 0n;
  i1 = 1n;
  i8 = 8n;
  result = u0;
  shift = u0;
  pos = start;
  read = i0;
  for (;;) {
    done = (read >= i8);
    if (done) {
      break;
    }
    byte_ = bget(data, pos);
    part = ((byte_ << shift) & MASK);
    result = (result | part);
    shift = ((shift + u8) & MASK);
    pos = (pos + i1);
    read = (read + i1);
  }
  return result;
}

export function boundedAdvance(data: Uint8Array, start: bigint, amount: bigint): bigint {
  let i0!: bigint;
  let negative!: boolean;
  let amount_i64!: bigint;
  let end_!: bigint;
  let n!: bigint;
  let inside!: boolean;
  i0 = 0n;
  negative = (start < i0);
  if (negative) {
    return i0;
  }
  amount_i64 = BigInt.asIntN(64, amount);
  end_ = (start + amount_i64);
  n = blen(data);
  inside = (end_ <= n);
  if (inside) {
    return end_;
  }
  return i0;
}

export function choiceListHeader(count: bigint): Uint8Array {
  let header!: number[];
  header = Array.from(u32ToLe(count));
  return Uint8Array.from(header);
}

export function serializeIntegerChoice(value_raw: Uint8Array): Uint8Array {
  let out!: number[];
  let tag!: bigint;
  let subtag!: bigint;
  let value!: number[];
  let length_i64!: bigint;
  let length!: bigint;
  let length_bytes!: number[];
  let with_length!: number[];
  let encoded!: number[];
  out = [];
  tag = 0n;
  subtag = 10n;
  out.push(Number(tag & 0xffn));
  out.push(Number(subtag & 0xffn));
  value = Array.from(canonicalizeSignedLe(value_raw));
  length_i64 = blen(value);
  length = (length_i64 & MASK);
  length_bytes = Array.from(u32ToLe(length));
  with_length = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(length_bytes)));
  encoded = Array.from(appendBytes(Uint8Array.from(with_length), Uint8Array.from(value)));
  return Uint8Array.from(encoded);
}

export function serializeBooleanChoice(value: boolean): Uint8Array {
  let out!: number[];
  let tag!: bigint;
  let byte_!: bigint;
  out = [];
  tag = 1n;
  byte_ = 0n;
  if (value) {
    byte_ = 1n;
  }
  out.push(Number(tag & 0xffn));
  out.push(Number(byte_ & 0xffn));
  return Uint8Array.from(out);
}

export function serializeFloatChoice(value: number): Uint8Array {
  let out!: number[];
  let tag!: bigint;
  let bits!: bigint;
  let raw!: number[];
  let encoded!: number[];
  out = [];
  tag = 2n;
  out.push(Number(tag & 0xffn));
  bits = f2bits(value);
  raw = Array.from(u64ToLe(bits));
  encoded = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(raw)));
  return Uint8Array.from(encoded);
}

export function serializeBytesChoice(value: Uint8Array): Uint8Array {
  let out!: number[];
  let tag!: bigint;
  let length_i64!: bigint;
  let length!: bigint;
  let length_bytes!: number[];
  let with_length!: number[];
  let encoded!: number[];
  out = [];
  tag = 3n;
  out.push(Number(tag & 0xffn));
  length_i64 = blen(value);
  length = (length_i64 & MASK);
  length_bytes = Array.from(u32ToLe(length));
  with_length = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(length_bytes)));
  encoded = Array.from(appendBytes(Uint8Array.from(with_length), value));
  return Uint8Array.from(encoded);
}

export function serializeStringChoicePacked(count: bigint, codepoints_le: Uint8Array): Uint8Array {
  let out!: number[];
  let tag!: bigint;
  let length_bytes!: number[];
  let with_length!: number[];
  let encoded!: number[];
  out = [];
  tag = 4n;
  out.push(Number(tag & 0xffn));
  length_bytes = Array.from(u32ToLe(count));
  with_length = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(length_bytes)));
  encoded = Array.from(appendBytes(Uint8Array.from(with_length), codepoints_le));
  return Uint8Array.from(encoded);
}

export function serializeCloneHeader(child_count: bigint): Uint8Array {
  let out!: number[];
  let tag!: bigint;
  let header!: number[];
  let encoded!: number[];
  out = [];
  tag = 5n;
  out.push(Number(tag & 0xffn));
  header = Array.from(choiceListHeader(child_count));
  encoded = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(header)));
  return Uint8Array.from(encoded);
}

export function serializeKeyedChoice(key: bigint, inner: Uint8Array): Uint8Array {
  let out!: number[];
  let tag!: bigint;
  let key_bytes!: number[];
  let with_key!: number[];
  let encoded!: number[];
  out = [];
  tag = 6n;
  out.push(Number(tag & 0xffn));
  key_bytes = Array.from(u64ToLe(key));
  with_key = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(key_bytes)));
  encoded = Array.from(appendBytes(Uint8Array.from(with_key), inner));
  return Uint8Array.from(encoded);
}

export function keyedEntryKey(data: Uint8Array, start: bigint): bigint | null {
  let i0!: bigint;
  let i1!: bigint;
  let u6!: bigint;
  let u8!: bigint;
  let none!: bigint | null;
  let n!: bigint;
  let start_negative!: boolean;
  let missing_tag!: boolean;
  let tag!: bigint;
  let keyed!: boolean;
  let unkeyed!: boolean;
  let key_start!: bigint;
  let key_end!: bigint;
  let truncated!: boolean;
  let key!: bigint;
  let found!: bigint | null;
  i0 = 0n;
  i1 = 1n;
  u6 = 6n;
  u8 = 8n;
  none = null;
  n = blen(data);
  start_negative = (start < i0);
  if (start_negative) {
    return none;
  }
  missing_tag = (start >= n);
  if (missing_tag) {
    return none;
  }
  tag = bget(data, start);
  keyed = (tag === u6);
  unkeyed = (!keyed);
  if (unkeyed) {
    return none;
  }
  key_start = (start + i1);
  key_end = boundedAdvance(data, key_start, u8);
  truncated = (key_end === i0);
  if (truncated) {
    return none;
  }
  key = readU64Le(data, key_start);
  found = key;
  return found;
}

export function keyedEntryInner(data: Uint8Array, start: bigint): bigint {
  let i0!: bigint;
  let i1!: bigint;
  let u8!: bigint;
  let key!: bigint | null;
  let present!: boolean;
  let absent!: boolean;
  let key_start!: bigint;
  let inner!: bigint;
  i0 = 0n;
  i1 = 1n;
  u8 = 8n;
  key = keyedEntryKey(data, start);
  present = (key !== null);
  absent = (!present);
  if (absent) {
    return i0;
  }
  key_start = (start + i1);
  inner = boundedAdvance(data, key_start, u8);
  return inner;
}

export function choiceEntryEnd(data: Uint8Array, start: bigint, depth: bigint): bigint {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u4!: bigint;
  let u8!: bigint;
  let u16!: bigint;
  let u100!: bigint;
  let too_deep!: boolean;
  let n!: bigint;
  let start_negative!: boolean;
  let missing_tag!: boolean;
  let tag!: bigint;
  let value_start!: bigint;
  let integer!: boolean;
  let sub_end!: bigint;
  let sub_missing!: boolean;
  let sub!: bigint;
  let sub0!: boolean;
  let end_!: bigint;
  let sub1!: boolean;
  let sub2!: boolean;
  let u3!: bigint;
  let sub3!: boolean;
  let sub4!: boolean;
  let u5!: bigint;
  let sub5!: boolean;
  let u6!: bigint;
  let sub6!: boolean;
  let u7!: bigint;
  let sub7!: boolean;
  let sub8!: boolean;
  let u9!: bigint;
  let sub9!: boolean;
  let u10!: bigint;
  let sub10!: boolean;
  let header_end!: bigint;
  let header_missing!: boolean;
  let length!: bigint;
  let boolean_!: boolean;
  let float_!: boolean;
  let bytes!: boolean;
  let string_!: boolean;
  let byte_length!: bigint;
  let keyed!: boolean;
  let inner!: bigint;
  let truncated!: boolean;
  let nested_key!: bigint | null;
  let double_keyed!: boolean;
  let clone!: boolean;
  let count!: bigint;
  let child_pos!: bigint;
  let child_index!: bigint;
  let child_depth!: bigint;
  let done!: boolean;
  let child_end!: bigint;
  let child_invalid!: boolean;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u4 = 4n;
  u8 = 8n;
  u16 = 16n;
  u100 = 100n;
  too_deep = (depth > u100);
  if (too_deep) {
    return i0;
  }
  n = blen(data);
  start_negative = (start < i0);
  if (start_negative) {
    return i0;
  }
  missing_tag = (start >= n);
  if (missing_tag) {
    return i0;
  }
  tag = bget(data, start);
  value_start = (start + i1);
  integer = (tag === u0);
  if (integer) {
    sub_end = boundedAdvance(data, value_start, u1);
    sub_missing = (sub_end === i0);
    if (sub_missing) {
      return i0;
    }
    sub = bget(data, value_start);
    sub0 = (sub === u0);
    if (sub0) {
      end_ = boundedAdvance(data, sub_end, u1);
      return end_;
    }
    sub1 = (sub === u1);
    if (sub1) {
      end_ = boundedAdvance(data, sub_end, u2);
      return end_;
    }
    sub2 = (sub === u2);
    if (sub2) {
      end_ = boundedAdvance(data, sub_end, u4);
      return end_;
    }
    u3 = 3n;
    sub3 = (sub === u3);
    if (sub3) {
      end_ = boundedAdvance(data, sub_end, u8);
      return end_;
    }
    sub4 = (sub === u4);
    if (sub4) {
      end_ = boundedAdvance(data, sub_end, u16);
      return end_;
    }
    u5 = 5n;
    sub5 = (sub === u5);
    if (sub5) {
      end_ = boundedAdvance(data, sub_end, u1);
      return end_;
    }
    u6 = 6n;
    sub6 = (sub === u6);
    if (sub6) {
      end_ = boundedAdvance(data, sub_end, u2);
      return end_;
    }
    u7 = 7n;
    sub7 = (sub === u7);
    if (sub7) {
      end_ = boundedAdvance(data, sub_end, u4);
      return end_;
    }
    sub8 = (sub === u8);
    if (sub8) {
      end_ = boundedAdvance(data, sub_end, u8);
      return end_;
    }
    u9 = 9n;
    sub9 = (sub === u9);
    if (sub9) {
      end_ = boundedAdvance(data, sub_end, u16);
      return end_;
    }
    u10 = 10n;
    sub10 = (sub === u10);
    if (sub10) {
      header_end = boundedAdvance(data, sub_end, u4);
      header_missing = (header_end === i0);
      if (header_missing) {
        return i0;
      }
      length = readU32Le(data, sub_end);
      end_ = boundedAdvance(data, header_end, length);
      return end_;
    }
    return i0;
  }
  boolean_ = (tag === u1);
  if (boolean_) {
    end_ = boundedAdvance(data, value_start, u1);
    return end_;
  }
  float_ = (tag === u2);
  if (float_) {
    end_ = boundedAdvance(data, value_start, u8);
    return end_;
  }
  u3 = 3n;
  bytes = (tag === u3);
  if (bytes) {
    header_end = boundedAdvance(data, value_start, u4);
    header_missing = (header_end === i0);
    if (header_missing) {
      return i0;
    }
    length = readU32Le(data, value_start);
    end_ = boundedAdvance(data, header_end, length);
    return end_;
  }
  string_ = (tag === u4);
  if (string_) {
    header_end = boundedAdvance(data, value_start, u4);
    header_missing = (header_end === i0);
    if (header_missing) {
      return i0;
    }
    length = readU32Le(data, value_start);
    byte_length = ((length * u4) & MASK);
    end_ = boundedAdvance(data, header_end, byte_length);
    return end_;
  }
  u6 = 6n;
  keyed = (tag === u6);
  if (keyed) {
    inner = boundedAdvance(data, value_start, u8);
    truncated = (inner === i0);
    if (truncated) {
      return i0;
    }
    nested_key = keyedEntryKey(data, inner);
    double_keyed = (nested_key !== null);
    if (double_keyed) {
      return i0;
    }
    end_ = choiceEntryEnd(data, inner, depth);
    return end_;
  }
  u5 = 5n;
  clone = (tag === u5);
  if (clone) {
    header_end = boundedAdvance(data, value_start, u4);
    header_missing = (header_end === i0);
    if (header_missing) {
      return i0;
    }
    count = readU32Le(data, value_start);
    child_pos = header_end;
    child_index = u0;
    child_depth = ((depth + u1) & MASK);
    for (;;) {
      done = (child_index >= count);
      if (done) {
        break;
      }
      child_end = choiceEntryEnd(data, child_pos, child_depth);
      child_invalid = (child_end === i0);
      if (child_invalid) {
        return i0;
      }
      child_pos = child_end;
      child_index = ((child_index + u1) & MASK);
    }
    return child_pos;
  }
  return i0;
}

export function choiceStreamValidate(data: Uint8Array): boolean {
  let i0!: bigint;
  let i4!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u4!: bigint;
  let header_end!: bigint;
  let header_missing!: boolean;
  let invalid!: boolean;
  let count!: bigint;
  let pos!: bigint;
  let index!: bigint;
  let done!: boolean;
  let end_!: bigint;
  let invalid_entry!: boolean;
  let valid!: boolean;
  i0 = 0n;
  i4 = 4n;
  u0 = 0n;
  u1 = 1n;
  u4 = 4n;
  header_end = boundedAdvance(data, i0, u4);
  header_missing = (header_end === i0);
  if (header_missing) {
    invalid = false;
    return invalid;
  }
  count = readU32Le(data, i0);
  pos = i4;
  index = u0;
  for (;;) {
    done = (index >= count);
    if (done) {
      break;
    }
    end_ = choiceEntryEnd(data, pos, u0);
    invalid_entry = (end_ === i0);
    if (invalid_entry) {
      invalid = false;
      return invalid;
    }
    pos = end_;
    index = ((index + u1) & MASK);
  }
  valid = true;
  return valid;
}

export function choiceStreamCount(data: Uint8Array): bigint {
  let i0!: bigint;
  let count!: bigint;
  i0 = 0n;
  count = readU32Le(data, i0);
  return count;
}

export function deserializeIntegerChoice(data: Uint8Array, start: bigint): Uint8Array | null {
  let i0!: bigint;
  let i1!: bigint;
  let i6!: bigint;
  let u0!: bigint;
  let u10!: bigint;
  let end_!: bigint;
  let invalid!: boolean;
  let none!: Uint8Array | null;
  let tag!: bigint;
  let wrong_tag!: boolean;
  let sub_pos!: bigint;
  let sub!: bigint;
  let wrong_sub!: boolean;
  let value_start!: bigint;
  let value!: number[];
  let canonical!: number[];
  let some!: Uint8Array | null;
  i0 = 0n;
  i1 = 1n;
  i6 = 6n;
  u0 = 0n;
  u10 = 10n;
  end_ = choiceEntryEnd(data, start, u0);
  invalid = (end_ === i0);
  if (invalid) {
    none = null;
    return none;
  }
  tag = bget(data, start);
  wrong_tag = (tag !== u0);
  if (wrong_tag) {
    none = null;
    return none;
  }
  sub_pos = (start + i1);
  sub = bget(data, sub_pos);
  wrong_sub = (sub !== u10);
  if (wrong_sub) {
    none = null;
    return none;
  }
  value_start = (start + i6);
  value = bslice(data, value_start, end_);
  canonical = Array.from(canonicalizeSignedLe(Uint8Array.from(value)));
  some = Uint8Array.from(canonical);
  return some;
}

export function deserializeBooleanChoice(data: Uint8Array, start: bigint): boolean | null {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let end_!: bigint;
  let invalid!: boolean;
  let none!: boolean | null;
  let tag!: bigint;
  let wrong_tag!: boolean;
  let value_pos!: bigint;
  let byte_!: bigint;
  let value!: boolean;
  let some!: boolean | null;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  end_ = choiceEntryEnd(data, start, u0);
  invalid = (end_ === i0);
  if (invalid) {
    none = null;
    return none;
  }
  tag = bget(data, start);
  wrong_tag = (tag !== u1);
  if (wrong_tag) {
    none = null;
    return none;
  }
  value_pos = (start + i1);
  byte_ = bget(data, value_pos);
  value = (byte_ !== u0);
  some = value;
  return some;
}

export function deserializeFloatChoice(data: Uint8Array, start: bigint): number | null {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u2!: bigint;
  let end_!: bigint;
  let invalid!: boolean;
  let none!: number | null;
  let tag!: bigint;
  let wrong_tag!: boolean;
  let value_pos!: bigint;
  let bits!: bigint;
  let value!: number;
  let some!: number | null;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u2 = 2n;
  end_ = choiceEntryEnd(data, start, u0);
  invalid = (end_ === i0);
  if (invalid) {
    none = null;
    return none;
  }
  tag = bget(data, start);
  wrong_tag = (tag !== u2);
  if (wrong_tag) {
    none = null;
    return none;
  }
  value_pos = (start + i1);
  bits = readU64Le(data, value_pos);
  value = bits2f(bits);
  some = value;
  return some;
}

export function deserializeBytesChoice(data: Uint8Array, start: bigint): Uint8Array | null {
  let i0!: bigint;
  let i5!: bigint;
  let u0!: bigint;
  let u3!: bigint;
  let end_!: bigint;
  let invalid!: boolean;
  let none!: Uint8Array | null;
  let tag!: bigint;
  let wrong_tag!: boolean;
  let value_start!: bigint;
  let value!: number[];
  let some!: Uint8Array | null;
  i0 = 0n;
  i5 = 5n;
  u0 = 0n;
  u3 = 3n;
  end_ = choiceEntryEnd(data, start, u0);
  invalid = (end_ === i0);
  if (invalid) {
    none = null;
    return none;
  }
  tag = bget(data, start);
  wrong_tag = (tag !== u3);
  if (wrong_tag) {
    none = null;
    return none;
  }
  value_start = (start + i5);
  value = bslice(data, value_start, end_);
  some = Uint8Array.from(value);
  return some;
}

export function deserializeStringChoice(data: Uint8Array, start: bigint): Uint8Array | null {
  let i0!: bigint;
  let i5!: bigint;
  let u0!: bigint;
  let u4!: bigint;
  let end_!: bigint;
  let invalid!: boolean;
  let none!: Uint8Array | null;
  let tag!: bigint;
  let wrong_tag!: boolean;
  let value_start!: bigint;
  let value!: number[];
  let some!: Uint8Array | null;
  i0 = 0n;
  i5 = 5n;
  u0 = 0n;
  u4 = 4n;
  end_ = choiceEntryEnd(data, start, u0);
  invalid = (end_ === i0);
  if (invalid) {
    none = null;
    return none;
  }
  tag = bget(data, start);
  wrong_tag = (tag !== u4);
  if (wrong_tag) {
    none = null;
    return none;
  }
  value_start = (start + i5);
  value = bslice(data, value_start, end_);
  some = Uint8Array.from(value);
  return some;
}

export function failureUseCompressed(compressed_n: bigint, raw_n: bigint): boolean {
  let max!: bigint;
  let shorter!: boolean;
  let fits!: boolean;
  let use_!: boolean;
  max = maxDecompressedLen();
  shorter = (compressed_n < raw_n);
  fits = (raw_n <= max);
  use_ = (shorter && fits);
  return use_;
}

export function rawFailureEncode(serialized_choices: Uint8Array): string {
  let raw_payload!: number[];
  let prefix_raw!: bigint;
  let prefix_zlib!: bigint;
  let raw_prefixed!: number[];
  let compressed!: number[];
  let compressed_len!: bigint;
  let compressed_n!: bigint;
  let raw_len!: bigint;
  let raw_n!: bigint;
  let use_compressed!: boolean;
  let chosen!: number[];
  let zlib_payload!: number[];
  let blob!: number[];
  raw_payload = [];
  prefix_raw = 0n;
  prefix_zlib = 1n;
  raw_payload.push(Number(prefix_raw & 0xffn));
  raw_prefixed = Array.from(appendBytes(Uint8Array.from(raw_payload), serialized_choices));
  compressed = Array.from(zlibCompress(serialized_choices));
  compressed_len = blen(compressed);
  compressed_n = (compressed_len & MASK);
  raw_len = blen(serialized_choices);
  raw_n = (raw_len & MASK);
  use_compressed = failureUseCompressed(compressed_n, raw_n);
  chosen = raw_prefixed.slice();
  if (use_compressed) {
    zlib_payload = [];
    zlib_payload.push(Number(prefix_zlib & 0xffn));
    chosen = Array.from(appendBytes(Uint8Array.from(zlib_payload), Uint8Array.from(compressed)));
  }
  blob = fromStr(base64Encode(Uint8Array.from(chosen)));
  return toStr(blob);
}

export function rawFailureDecode(blob: Uint8Array): Uint8Array | null {
  let decoded!: Uint8Array | null;
  let present!: boolean;
  let missing!: boolean;
  let none!: Uint8Array | null;
  let payload!: number[];
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let n!: bigint;
  let empty!: boolean;
  let prefix!: bigint;
  let u1_prefix!: bigint;
  let raw!: boolean;
  let compressed!: boolean;
  let known!: boolean;
  let unknown!: boolean;
  let serialized!: number[];
  let inflated!: Uint8Array | null;
  let inflated_ok!: boolean;
  let inflate_failed!: boolean;
  let valid!: boolean;
  let invalid!: boolean;
  let some!: Uint8Array | null;
  decoded = base64Decode(blob);
  present = (decoded !== null);
  missing = (!present);
  if (missing) {
    none = null;
    return none;
  }
  payload = Array.from(decoded!);
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  n = blen(payload);
  empty = (n === i0);
  if (empty) {
    none = null;
    return none;
  }
  prefix = bget(payload, i0);
  u1_prefix = 1n;
  raw = (prefix === u0);
  compressed = (prefix === u1_prefix);
  known = (raw || compressed);
  unknown = (!known);
  if (unknown) {
    none = null;
    return none;
  }
  serialized = bslice(payload, i1, n);
  if (compressed) {
    inflated = zlibDecompress(Uint8Array.from(serialized));
    inflated_ok = (inflated !== null);
    inflate_failed = (!inflated_ok);
    if (inflate_failed) {
      none = null;
      return none;
    }
    serialized = Array.from(inflated!);
  }
  valid = choiceStreamValidate(Uint8Array.from(serialized));
  invalid = (!valid);
  if (invalid) {
    none = null;
    return none;
  }
  some = Uint8Array.from(serialized);
  return some;
}

export function alphabetCodepointAllowed(codepoint: bigint): boolean {
  let false_!: boolean;
  let true_!: boolean;
  let max!: bigint;
  let surrogate_low!: bigint;
  let surrogate_high!: bigint;
  let too_high!: boolean;
  let at_or_above_low!: boolean;
  let at_or_below_high!: boolean;
  let surrogate!: boolean;
  false_ = false;
  true_ = true;
  max = 1114111n;
  surrogate_low = 55296n;
  surrogate_high = 57343n;
  too_high = (codepoint > max);
  if (too_high) {
    return false_;
  }
  at_or_above_low = (codepoint >= surrogate_low);
  at_or_below_high = (codepoint <= surrogate_high);
  surrogate = (at_or_above_low && at_or_below_high);
  if (surrogate) {
    return false_;
  }
  return true_;
}

export function alphabetIntervalCount(alphabet: Uint8Array): bigint {
  let u3!: bigint;
  let length!: bigint;
  let length_u64!: bigint;
  let count!: bigint;
  u3 = 3n;
  length = blen(alphabet);
  length_u64 = (length & MASK);
  count = (length_u64 >> u3);
  return count;
}

export function alphabetIntervalStart(alphabet: Uint8Array, interval: bigint): bigint {
  let i8!: bigint;
  let interval_i64!: bigint;
  let offset!: bigint;
  let start!: bigint;
  i8 = 8n;
  interval_i64 = BigInt.asIntN(64, interval);
  offset = (interval_i64 * i8);
  start = readU32Le(alphabet, offset);
  return start;
}

export function alphabetIntervalEnd(alphabet: Uint8Array, interval: bigint): bigint {
  let i4!: bigint;
  let i8!: bigint;
  let interval_i64!: bigint;
  let base!: bigint;
  let offset!: bigint;
  let end_!: bigint;
  i4 = 4n;
  i8 = 8n;
  interval_i64 = BigInt.asIntN(64, interval);
  base = (interval_i64 * i8);
  offset = (base + i4);
  end_ = readU32Le(alphabet, offset);
  return end_;
}

export function alphabetValid(alphabet: Uint8Array): boolean {
  let false_!: boolean;
  let true_!: boolean;
  let i0!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u3!: bigint;
  let length!: bigint;
  let empty!: boolean;
  let length_u64!: bigint;
  let count_u64!: bigint;
  let exact!: bigint;
  let ragged!: boolean;
  let previous_end!: bigint;
  let interval!: bigint;
  let done!: boolean;
  let start!: bigint;
  let end_!: bigint;
  let descending!: boolean;
  let start_ok!: boolean;
  let start_bad!: boolean;
  let end_ok!: boolean;
  let end_bad!: boolean;
  let surrogate_low!: bigint;
  let surrogate_high!: bigint;
  let spans_below!: boolean;
  let spans_above!: boolean;
  let straddles!: boolean;
  let later!: boolean;
  let needed!: bigint;
  let touching!: boolean;
  false_ = false;
  true_ = true;
  i0 = 0n;
  u0 = 0n;
  u1 = 1n;
  u3 = 3n;
  length = blen(alphabet);
  empty = (length <= i0);
  if (empty) {
    return false_;
  }
  length_u64 = (length & MASK);
  count_u64 = (length_u64 >> u3);
  exact = ((count_u64 << u3) & MASK);
  ragged = (exact !== length_u64);
  if (ragged) {
    return false_;
  }
  previous_end = u0;
  interval = u0;
  for (;;) {
    done = (interval >= count_u64);
    if (done) {
      break;
    }
    start = alphabetIntervalStart(alphabet, interval);
    end_ = alphabetIntervalEnd(alphabet, interval);
    descending = (start > end_);
    if (descending) {
      return false_;
    }
    start_ok = alphabetCodepointAllowed(start);
    start_bad = (!start_ok);
    if (start_bad) {
      return false_;
    }
    end_ok = alphabetCodepointAllowed(end_);
    end_bad = (!end_ok);
    if (end_bad) {
      return false_;
    }
    surrogate_low = 55296n;
    surrogate_high = 57343n;
    spans_below = (start <= surrogate_high);
    spans_above = (end_ >= surrogate_low);
    straddles = (spans_below && spans_above);
    if (straddles) {
      return false_;
    }
    later = (interval > u0);
    if (later) {
      needed = ((previous_end + u1) & MASK);
      touching = (start <= needed);
      if (touching) {
        return false_;
      }
    }
    previous_end = end_;
    interval = ((interval + u1) & MASK);
  }
  return true_;
}

export function alphabetSize(alphabet: Uint8Array): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let count!: bigint;
  let size!: bigint;
  let interval!: bigint;
  let done!: boolean;
  let start!: bigint;
  let end_!: bigint;
  let span!: bigint;
  let members!: bigint;
  u0 = 0n;
  u1 = 1n;
  count = alphabetIntervalCount(alphabet);
  size = u0;
  interval = u0;
  for (;;) {
    done = (interval >= count);
    if (done) {
      break;
    }
    start = alphabetIntervalStart(alphabet, interval);
    end_ = alphabetIntervalEnd(alphabet, interval);
    span = ((end_ - start) & MASK);
    members = ((span + u1) & MASK);
    size = ((size + members) & MASK);
    interval = ((interval + u1) & MASK);
  }
  return size;
}

export function alphabetIndexOf(alphabet: Uint8Array, codepoint: bigint): bigint | null {
  let u0!: bigint;
  let u1!: bigint;
  let count!: bigint;
  let offset!: bigint;
  let interval!: bigint;
  let done!: boolean;
  let start!: bigint;
  let end_!: bigint;
  let at_or_above!: boolean;
  let at_or_below!: boolean;
  let inside!: boolean;
  let within!: bigint;
  let index!: bigint;
  let found!: bigint | null;
  let span!: bigint;
  let members!: bigint;
  let missing!: bigint | null;
  u0 = 0n;
  u1 = 1n;
  count = alphabetIntervalCount(alphabet);
  offset = u0;
  interval = u0;
  for (;;) {
    done = (interval >= count);
    if (done) {
      break;
    }
    start = alphabetIntervalStart(alphabet, interval);
    end_ = alphabetIntervalEnd(alphabet, interval);
    at_or_above = (codepoint >= start);
    at_or_below = (codepoint <= end_);
    inside = (at_or_above && at_or_below);
    if (inside) {
      within = ((codepoint - start) & MASK);
      index = ((offset + within) & MASK);
      found = index;
      return found;
    }
    span = ((end_ - start) & MASK);
    members = ((span + u1) & MASK);
    offset = ((offset + members) & MASK);
    interval = ((interval + u1) & MASK);
  }
  missing = null;
  return missing;
}

export function alphabetCodepointAt(alphabet: Uint8Array, index: bigint): bigint | null {
  let u0!: bigint;
  let u1!: bigint;
  let count!: bigint;
  let remaining!: bigint;
  let interval!: bigint;
  let done!: boolean;
  let start!: bigint;
  let end_!: bigint;
  let span!: bigint;
  let members!: bigint;
  let inside!: boolean;
  let codepoint!: bigint;
  let found!: bigint | null;
  let missing!: bigint | null;
  u0 = 0n;
  u1 = 1n;
  count = alphabetIntervalCount(alphabet);
  remaining = index;
  interval = u0;
  for (;;) {
    done = (interval >= count);
    if (done) {
      break;
    }
    start = alphabetIntervalStart(alphabet, interval);
    end_ = alphabetIntervalEnd(alphabet, interval);
    span = ((end_ - start) & MASK);
    members = ((span + u1) & MASK);
    inside = (remaining < members);
    if (inside) {
      codepoint = ((start + remaining) & MASK);
      found = codepoint;
      return found;
    }
    remaining = ((remaining - members) & MASK);
    interval = ((interval + u1) & MASK);
  }
  missing = null;
  return missing;
}

export function alphabetContains(alphabet: Uint8Array, codepoint: bigint): boolean {
  let index!: bigint | null;
  let present!: boolean;
  index = alphabetIndexOf(alphabet, codepoint);
  present = (index !== null);
  return present;
}

export function alphabetIndexAbove(alphabet: Uint8Array, codepoint: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let count!: bigint;
  let below!: bigint;
  let interval!: bigint;
  let done!: boolean;
  let start!: bigint;
  let end_!: bigint;
  let before_interval!: boolean;
  let inside!: boolean;
  let within!: bigint;
  let index!: bigint;
  let span!: bigint;
  let members!: bigint;
  u0 = 0n;
  u1 = 1n;
  count = alphabetIntervalCount(alphabet);
  below = u0;
  interval = u0;
  for (;;) {
    done = (interval >= count);
    if (done) {
      break;
    }
    start = alphabetIntervalStart(alphabet, interval);
    end_ = alphabetIntervalEnd(alphabet, interval);
    before_interval = (codepoint <= start);
    if (before_interval) {
      return below;
    }
    inside = (codepoint <= end_);
    if (inside) {
      within = ((codepoint - start) & MASK);
      index = ((below + within) & MASK);
      return index;
    }
    span = ((end_ - start) & MASK);
    members = ((span + u1) & MASK);
    below = ((below + members) & MASK);
    interval = ((interval + u1) & MASK);
  }
  return below;
}

export function alphabetShrinkPivot(alphabet: Uint8Array): bigint {
  let zero!: bigint;
  let pivot!: bigint;
  zero = 48n;
  pivot = alphabetIndexAbove(alphabet, zero);
  return pivot;
}

export function alphabetShrinkLast(alphabet: Uint8Array): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let upper_z!: bigint;
  let found!: bigint | null;
  let present!: boolean;
  let index!: bigint;
  let pivot!: bigint;
  let at_front!: boolean;
  let last!: bigint;
  u0 = 0n;
  u1 = 1n;
  upper_z = 90n;
  found = alphabetIndexOf(alphabet, upper_z);
  present = (found !== null);
  if (present) {
    index = found!;
    return index;
  }
  pivot = alphabetShrinkPivot(alphabet);
  at_front = (pivot === u0);
  if (at_front) {
    return u0;
  }
  last = ((pivot - u1) & MASK);
  return last;
}

export function alphabetShrinkPromoted(alphabet: Uint8Array): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let pivot!: bigint;
  let last!: bigint;
  let empty!: boolean;
  let span!: bigint;
  let promoted!: bigint;
  u0 = 0n;
  u1 = 1n;
  pivot = alphabetShrinkPivot(alphabet);
  last = alphabetShrinkLast(alphabet);
  empty = (last < pivot);
  if (empty) {
    return u0;
  }
  span = ((last - pivot) & MASK);
  promoted = ((span + u1) & MASK);
  return promoted;
}

export function alphabetShrinkIndex(alphabet: Uint8Array, rank: bigint): bigint {
  let size!: bigint;
  let past_end!: boolean;
  let pivot!: bigint;
  let last!: bigint;
  let promoted!: bigint;
  let in_promoted!: boolean;
  let index!: bigint;
  let displaced!: boolean;
  size = alphabetSize(alphabet);
  past_end = (rank >= size);
  if (past_end) {
    return rank;
  }
  pivot = alphabetShrinkPivot(alphabet);
  last = alphabetShrinkLast(alphabet);
  promoted = alphabetShrinkPromoted(alphabet);
  in_promoted = (rank < promoted);
  if (in_promoted) {
    index = ((pivot + rank) & MASK);
    return index;
  }
  displaced = (rank <= last);
  if (displaced) {
    index = ((rank - promoted) & MASK);
    return index;
  }
  return rank;
}

export function alphabetShrinkRank(alphabet: Uint8Array, index: bigint): bigint {
  let size!: bigint;
  let past_end!: boolean;
  let pivot!: bigint;
  let last!: bigint;
  let promoted!: bigint;
  let at_or_above!: boolean;
  let at_or_below!: boolean;
  let in_promoted!: boolean;
  let rank!: bigint;
  let below!: boolean;
  size = alphabetSize(alphabet);
  past_end = (index >= size);
  if (past_end) {
    return index;
  }
  pivot = alphabetShrinkPivot(alphabet);
  last = alphabetShrinkLast(alphabet);
  promoted = alphabetShrinkPromoted(alphabet);
  at_or_above = (index >= pivot);
  at_or_below = (index <= last);
  in_promoted = (at_or_above && at_or_below);
  if (in_promoted) {
    rank = ((index - pivot) & MASK);
    return rank;
  }
  below = (index < pivot);
  if (below) {
    rank = ((index + promoted) & MASK);
    return rank;
  }
  return index;
}

export function alphabetShrinkCodepoint(alphabet: Uint8Array, rank: bigint): bigint | null {
  let index!: bigint;
  let codepoint!: bigint | null;
  index = alphabetShrinkIndex(alphabet, rank);
  codepoint = alphabetCodepointAt(alphabet, index);
  return codepoint;
}

export function alphabetRange(min_codepoint: bigint, max_codepoint: bigint): Uint8Array {
  let out!: number[];
  let max!: bigint;
  let surrogate_below!: bigint;
  let surrogate_above!: bigint;
  let low!: bigint;
  let high!: bigint;
  let over!: boolean;
  let empty!: boolean;
  let starts_below!: boolean;
  let first_end!: bigint;
  let clip!: boolean;
  let start_bytes!: number[];
  let end_bytes!: number[];
  let ends_above!: boolean;
  let second_start!: bigint;
  let lift!: boolean;
  out = [];
  max = 1114111n;
  surrogate_below = 55295n;
  surrogate_above = 57344n;
  low = min_codepoint;
  high = max_codepoint;
  over = (high > max);
  if (over) {
    high = max;
  }
  empty = (low > high);
  if (empty) {
    return Uint8Array.from(out);
  }
  starts_below = (low <= surrogate_below);
  if (starts_below) {
    first_end = high;
    clip = (first_end > surrogate_below);
    if (clip) {
      first_end = surrogate_below;
    }
    start_bytes = Array.from(u32ToLe(low));
    end_bytes = Array.from(u32ToLe(first_end));
    out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(start_bytes)));
    out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(end_bytes)));
  }
  ends_above = (high >= surrogate_above);
  if (ends_above) {
    second_start = low;
    lift = (second_start < surrogate_above);
    if (lift) {
      second_start = surrogate_above;
    }
    start_bytes = Array.from(u32ToLe(second_start));
    end_bytes = Array.from(u32ToLe(high));
    out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(start_bytes)));
    out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(end_bytes)));
  }
  return Uint8Array.from(out);
}

export function alphabetInsert(alphabet: Uint8Array, codepoint: bigint): Uint8Array {
  let u0!: bigint;
  let u1!: bigint;
  let count!: bigint;
  let out!: number[];
  let allowed!: boolean;
  let rejected!: boolean;
  let unchanged!: number[];
  let pending_start!: bigint;
  let pending_end!: bigint;
  let placed!: boolean;
  let interval!: bigint;
  let done!: boolean;
  let start!: bigint;
  let end_!: bigint;
  let gap_start!: bigint;
  let strictly_below!: boolean;
  let start_bytes!: number[];
  let end_bytes!: number[];
  let touches_below!: boolean;
  let gap_end!: bigint;
  let strictly_above!: boolean;
  let not_yet!: boolean;
  let pending_start_bytes!: number[];
  let pending_end_bytes!: number[];
  let overlaps!: boolean;
  let lower!: boolean;
  let higher!: boolean;
  let unplaced!: boolean;
  u0 = 0n;
  u1 = 1n;
  count = alphabetIntervalCount(alphabet);
  out = [];
  allowed = alphabetCodepointAllowed(codepoint);
  rejected = (!allowed);
  if (rejected) {
    unchanged = Array.from(appendBytes(Uint8Array.from(out), alphabet));
    return Uint8Array.from(unchanged);
  }
  pending_start = codepoint;
  pending_end = codepoint;
  placed = false;
  interval = u0;
  for (;;) {
    done = (interval >= count);
    if (done) {
      break;
    }
    start = alphabetIntervalStart(alphabet, interval);
    end_ = alphabetIntervalEnd(alphabet, interval);
    gap_start = ((end_ + u1) & MASK);
    strictly_below = (gap_start < pending_start);
    if (strictly_below) {
      start_bytes = Array.from(u32ToLe(start));
      end_bytes = Array.from(u32ToLe(end_));
      out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(start_bytes)));
      out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(end_bytes)));
    }
    touches_below = (!strictly_below);
    if (touches_below) {
      gap_end = ((pending_end + u1) & MASK);
      strictly_above = (start > gap_end);
      if (strictly_above) {
        not_yet = (!placed);
        if (not_yet) {
          pending_start_bytes = Array.from(u32ToLe(pending_start));
          pending_end_bytes = Array.from(u32ToLe(pending_end));
          out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(pending_start_bytes)));
          out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(pending_end_bytes)));
          placed = true;
        }
        start_bytes = Array.from(u32ToLe(start));
        end_bytes = Array.from(u32ToLe(end_));
        out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(start_bytes)));
        out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(end_bytes)));
      }
      overlaps = (!strictly_above);
      if (overlaps) {
        lower = (start < pending_start);
        if (lower) {
          pending_start = start;
        }
        higher = (end_ > pending_end);
        if (higher) {
          pending_end = end_;
        }
      }
    }
    interval = ((interval + u1) & MASK);
  }
  unplaced = (!placed);
  if (unplaced) {
    pending_start_bytes = Array.from(u32ToLe(pending_start));
    pending_end_bytes = Array.from(u32ToLe(pending_end));
    out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(pending_start_bytes)));
    out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(pending_end_bytes)));
  }
  return Uint8Array.from(out);
}

export function stringLength(value: Uint8Array): bigint {
  let u2!: bigint;
  let length!: bigint;
  let length_u64!: bigint;
  let count_u64!: bigint;
  let count!: bigint;
  u2 = 2n;
  length = blen(value);
  length_u64 = (length & MASK);
  count_u64 = (length_u64 >> u2);
  count = BigInt.asIntN(64, count_u64);
  return count;
}

export function stringCodepointAt(value: Uint8Array, position: bigint): bigint {
  let i4!: bigint;
  let offset!: bigint;
  let codepoint!: bigint;
  i4 = 4n;
  offset = (position * i4);
  codepoint = readU32Le(value, offset);
  return codepoint;
}

export function stringValidate(alphabet: Uint8Array, min_size: bigint, max_size: bigint, value: Uint8Array): boolean {
  let false_!: boolean;
  let true_!: boolean;
  let i0!: bigint;
  let i1!: bigint;
  let i4!: bigint;
  let length!: bigint;
  let count!: bigint;
  let exact!: bigint;
  let ragged!: boolean;
  let too_short!: boolean;
  let too_long!: boolean;
  let position!: bigint;
  let done!: boolean;
  let codepoint!: bigint;
  let member!: boolean;
  let outside!: boolean;
  false_ = false;
  true_ = true;
  i0 = 0n;
  i1 = 1n;
  i4 = 4n;
  length = blen(value);
  count = stringLength(value);
  exact = (count * i4);
  ragged = (exact !== length);
  if (ragged) {
    return false_;
  }
  too_short = (count < min_size);
  if (too_short) {
    return false_;
  }
  too_long = (count > max_size);
  if (too_long) {
    return false_;
  }
  position = i0;
  for (;;) {
    done = (position >= count);
    if (done) {
      break;
    }
    codepoint = stringCodepointAt(value, position);
    member = alphabetContains(alphabet, codepoint);
    outside = (!member);
    if (outside) {
      return false_;
    }
    position = (position + i1);
  }
  return true_;
}

export function stringSimplest(alphabet: Uint8Array, min_size: bigint): Uint8Array {
  let out!: number[];
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let first!: bigint | null;
  let present!: boolean;
  let empty_alphabet!: boolean;
  let codepoint!: bigint;
  let packed_!: number[];
  let position!: bigint;
  let done!: boolean;
  out = [];
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  first = alphabetShrinkCodepoint(alphabet, u0);
  present = (first !== null);
  empty_alphabet = (!present);
  if (empty_alphabet) {
    return Uint8Array.from(out);
  }
  codepoint = first!;
  packed_ = Array.from(u32ToLe(codepoint));
  position = i0;
  for (;;) {
    done = (position >= min_size);
    if (done) {
      break;
    }
    out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(packed_)));
    position = (position + i1);
  }
  return Uint8Array.from(out);
}

export function stringUnit(alphabet: Uint8Array, min_size: bigint, max_size: bigint): Uint8Array {
  let out!: number[];
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let first!: bigint | null;
  let present!: boolean;
  let empty_alphabet!: boolean;
  let lowest!: bigint;
  let next_!: bigint | null;
  let has_next!: boolean;
  let stepped!: bigint;
  let second!: bigint;
  let lowest_packed!: number[];
  let stepped_packed!: number[];
  let has_minimum!: boolean;
  let last!: bigint;
  let position!: bigint;
  let done!: boolean;
  let is_last!: boolean;
  let is_earlier!: boolean;
  let has_room!: boolean;
  out = [];
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  first = alphabetShrinkCodepoint(alphabet, u0);
  present = (first !== null);
  empty_alphabet = (!present);
  if (empty_alphabet) {
    return Uint8Array.from(out);
  }
  lowest = first!;
  next_ = alphabetShrinkCodepoint(alphabet, u1);
  has_next = (next_ !== null);
  stepped = lowest;
  if (has_next) {
    second = next_!;
    stepped = second;
  }
  lowest_packed = Array.from(u32ToLe(lowest));
  stepped_packed = Array.from(u32ToLe(stepped));
  has_minimum = (min_size > i0);
  if (has_minimum) {
    last = (min_size - i1);
    position = i0;
    for (;;) {
      done = (position >= min_size);
      if (done) {
        break;
      }
      is_last = (position === last);
      if (is_last) {
        out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(stepped_packed)));
      }
      is_earlier = (!is_last);
      if (is_earlier) {
        out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(lowest_packed)));
      }
      position = (position + i1);
    }
    return Uint8Array.from(out);
  }
  has_room = (max_size > i0);
  if (has_room) {
    out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(stepped_packed)));
  }
  return Uint8Array.from(out);
}

export function stringDuplicateRank(alphabet: Uint8Array, value: Uint8Array): bigint | null {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u4!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let length!: bigint;
  let ranks!: number[];
  let at!: bigint;
  let done!: boolean;
  let codepoint!: bigint;
  let index!: bigint | null;
  let present!: boolean;
  let stored!: bigint;
  let index_value!: bigint;
  let rank!: bigint;
  let stored_byte!: bigint;
  let packed_all!: boolean;
  let stored_low!: bigint;
  let best!: bigint;
  let found!: boolean;
  let lowerable!: boolean;
  let improves!: boolean;
  let not_found!: boolean;
  let better!: boolean;
  let worth_counting!: boolean;
  let seen!: bigint;
  let other!: bigint;
  let counted!: boolean;
  let other_stored!: bigint;
  let same!: boolean;
  let twice!: boolean;
  let repeated!: boolean;
  let missing!: boolean;
  let none!: bigint | null;
  let some!: bigint | null;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u4 = 4n;
  u8 = 8n;
  u255 = 255n;
  length = stringLength(value);
  ranks = [];
  at = i0;
  for (;;) {
    done = (at >= length);
    if (done) {
      break;
    }
    codepoint = stringCodepointAt(value, at);
    index = alphabetIndexOf(alphabet, codepoint);
    present = (index !== null);
    stored = u0;
    if (present) {
      index_value = index!;
      rank = alphabetShrinkRank(alphabet, index_value);
      stored = ((rank + u1) & MASK);
    }
    stored_byte = u0;
    for (;;) {
      packed_all = (stored_byte === u4);
      if (packed_all) {
        break;
      }
      stored_low = (stored & u255);
      ranks.push(Number(stored_low & 0xffn));
      stored = (stored >> u8);
      stored_byte = ((stored_byte + u1) & MASK);
    }
    at = (at + i1);
  }
  best = u0;
  found = false;
  at = i0;
  for (;;) {
    done = (at >= length);
    if (done) {
      break;
    }
    stored = stringCodepointAt(Uint8Array.from(ranks), at);
    present = (stored !== u0);
    if (present) {
      rank = ((stored - u1) & MASK);
      lowerable = (rank !== u0);
      improves = (rank > best);
      not_found = (!found);
      better = (improves || not_found);
      worth_counting = (lowerable && better);
      if (worth_counting) {
        seen = u0;
        other = i0;
        for (;;) {
          counted = (other >= length);
          if (counted) {
            break;
          }
          other_stored = stringCodepointAt(Uint8Array.from(ranks), other);
          same = (other_stored === stored);
          if (same) {
            seen = ((seen + u1) & MASK);
            twice = (seen >= u2);
            if (twice) {
              break;
            }
          }
          other = (other + i1);
        }
        repeated = (seen >= u2);
        if (repeated) {
          best = rank;
          found = true;
        }
      }
    }
    at = (at + i1);
  }
  missing = (!found);
  if (missing) {
    none = null;
    return none;
  }
  some = best;
  return some;
}

export function stringReplaceRank(alphabet: Uint8Array, value: Uint8Array, from_rank: bigint, to_rank: bigint): Uint8Array | null {
  let i0!: bigint;
  let i1!: bigint;
  let unchanged!: boolean;
  let none_same!: Uint8Array | null;
  let target!: bigint | null;
  let target_present!: boolean;
  let target_missing!: boolean;
  let none_target!: Uint8Array | null;
  let target_codepoint!: bigint;
  let length!: bigint;
  let out!: number[];
  let at!: bigint;
  let done!: boolean;
  let codepoint!: bigint;
  let emitted!: bigint;
  let index!: bigint | null;
  let present!: boolean;
  let index_value!: bigint;
  let rank!: bigint;
  let matches!: boolean;
  let packed_!: number[];
  let some!: Uint8Array | null;
  i0 = 0n;
  i1 = 1n;
  unchanged = (from_rank === to_rank);
  if (unchanged) {
    none_same = null;
    return none_same;
  }
  target = alphabetShrinkCodepoint(alphabet, to_rank);
  target_present = (target !== null);
  target_missing = (!target_present);
  if (target_missing) {
    none_target = null;
    return none_target;
  }
  target_codepoint = target!;
  length = stringLength(value);
  out = [];
  at = i0;
  for (;;) {
    done = (at >= length);
    if (done) {
      break;
    }
    codepoint = stringCodepointAt(value, at);
    emitted = codepoint;
    index = alphabetIndexOf(alphabet, codepoint);
    present = (index !== null);
    if (present) {
      index_value = index!;
      rank = alphabetShrinkRank(alphabet, index_value);
      matches = (rank === from_rank);
      if (matches) {
        emitted = target_codepoint;
      }
    }
    packed_ = Array.from(u32ToLe(emitted));
    out = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(packed_)));
    at = (at + i1);
  }
  some = Uint8Array.from(out);
  return some;
}

export function stringDropCharacter(value: Uint8Array, min_size: bigint, position: bigint): Uint8Array | null {
  let i0!: bigint;
  let i1!: bigint;
  let length!: bigint;
  let at_minimum!: boolean;
  let none_minimum!: Uint8Array | null;
  let before_start!: boolean;
  let none_before!: Uint8Array | null;
  let past_end!: boolean;
  let none_past!: Uint8Array | null;
  let i4!: bigint;
  let whole!: bigint;
  let drop_start!: bigint;
  let drop_end!: bigint;
  let out!: number[];
  let at!: bigint;
  let done!: boolean;
  let before!: boolean;
  let after!: boolean;
  let kept!: boolean;
  let byte_!: bigint;
  let some!: Uint8Array | null;
  i0 = 0n;
  i1 = 1n;
  length = stringLength(value);
  at_minimum = (length <= min_size);
  if (at_minimum) {
    none_minimum = null;
    return none_minimum;
  }
  before_start = (position < i0);
  if (before_start) {
    none_before = null;
    return none_before;
  }
  past_end = (position >= length);
  if (past_end) {
    none_past = null;
    return none_past;
  }
  i4 = 4n;
  whole = (length * i4);
  drop_start = (position * i4);
  drop_end = (drop_start + i4);
  out = [];
  at = i0;
  for (;;) {
    done = (at >= whole);
    if (done) {
      break;
    }
    before = (at < drop_start);
    after = (at >= drop_end);
    kept = (before || after);
    if (kept) {
      byte_ = bget(value, at);
      out.push(Number(byte_ & 0xffn));
    }
    at = (at + i1);
  }
  some = Uint8Array.from(out);
  return some;
}

export function stringToIndex(alphabet: Uint8Array, min_size: bigint, value: Uint8Array): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let size!: bigint;
  let count!: bigint;
  let offset!: number[];
  let has_offset!: boolean;
  let length!: bigint;
  let done!: boolean;
  let scale!: bigint;
  let position!: number[];
  let pos!: bigint;
  let codepoint!: bigint;
  let found!: bigint | null;
  let present!: boolean;
  let rank!: bigint;
  let alphabet_index!: bigint;
  let index!: number[];
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  size = alphabetSize(alphabet);
  count = stringLength(value);
  offset = Array.from(bigintZero());
  has_offset = (count > min_size);
  if (has_offset) {
    length = min_size;
    for (;;) {
      done = (length >= count);
      if (done) {
        break;
      }
      offset = Array.from(positiveMulAddSmallLe(Uint8Array.from(offset), size, u1));
      length = (length + i1);
    }
    scale = i0;
    for (;;) {
      done = (scale >= min_size);
      if (done) {
        break;
      }
      offset = Array.from(positiveMulAddSmallLe(Uint8Array.from(offset), size, u0));
      scale = (scale + i1);
    }
  }
  position = Array.from(bigintZero());
  pos = i0;
  for (;;) {
    done = (pos >= count);
    if (done) {
      break;
    }
    codepoint = stringCodepointAt(value, pos);
    found = alphabetIndexOf(alphabet, codepoint);
    present = (found !== null);
    rank = u0;
    if (present) {
      alphabet_index = found!;
      rank = alphabetShrinkRank(alphabet, alphabet_index);
    }
    position = Array.from(positiveMulAddSmallLe(Uint8Array.from(position), size, rank));
    pos = (pos + i1);
  }
  index = Array.from(signedAddLe(Uint8Array.from(offset), Uint8Array.from(position)));
  return Uint8Array.from(index);
}

export function stringIndexCompare(alphabet: Uint8Array, min_size: bigint, left: Uint8Array, right: Uint8Array): bigint {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let negative_one!: bigint;
  let size!: bigint;
  let left_count!: bigint;
  let right_count!: bigint;
  let has_members!: boolean;
  let left_sized!: boolean;
  let right_sized!: boolean;
  let both_sized!: boolean;
  let direct!: boolean;
  let indirect!: boolean;
  let left_index!: number[];
  let right_index!: number[];
  let order!: bigint;
  let left_shorter!: boolean;
  let left_longer!: boolean;
  let pos!: bigint;
  let done!: boolean;
  let left_codepoint!: bigint;
  let right_codepoint!: bigint;
  let differs!: boolean;
  let left_found!: bigint | null;
  let left_present!: boolean;
  let left_rank!: bigint;
  let left_alphabet_index!: bigint;
  let right_found!: bigint | null;
  let right_present!: boolean;
  let right_rank!: bigint;
  let right_alphabet_index!: bigint;
  let rank_less!: boolean;
  let rank_greater!: boolean;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  negative_one = (i0 - i1);
  size = alphabetSize(alphabet);
  left_count = stringLength(left);
  right_count = stringLength(right);
  has_members = (size !== u0);
  left_sized = (left_count >= min_size);
  right_sized = (right_count >= min_size);
  both_sized = (left_sized && right_sized);
  direct = (has_members && both_sized);
  indirect = (!direct);
  if (indirect) {
    left_index = Array.from(stringToIndex(alphabet, min_size, left));
    right_index = Array.from(stringToIndex(alphabet, min_size, right));
    order = signedCompareLe(Uint8Array.from(left_index), Uint8Array.from(right_index));
    return order;
  }
  left_shorter = (left_count < right_count);
  if (left_shorter) {
    return negative_one;
  }
  left_longer = (left_count > right_count);
  if (left_longer) {
    return i1;
  }
  pos = i0;
  for (;;) {
    done = (pos >= left_count);
    if (done) {
      break;
    }
    left_codepoint = stringCodepointAt(left, pos);
    right_codepoint = stringCodepointAt(right, pos);
    differs = (left_codepoint !== right_codepoint);
    if (differs) {
      left_found = alphabetIndexOf(alphabet, left_codepoint);
      left_present = (left_found !== null);
      left_rank = u0;
      if (left_present) {
        left_alphabet_index = left_found!;
        left_rank = alphabetShrinkRank(alphabet, left_alphabet_index);
      }
      right_found = alphabetIndexOf(alphabet, right_codepoint);
      right_present = (right_found !== null);
      right_rank = u0;
      if (right_present) {
        right_alphabet_index = right_found!;
        right_rank = alphabetShrinkRank(alphabet, right_alphabet_index);
      }
      rank_less = (left_rank < right_rank);
      if (rank_less) {
        return negative_one;
      }
      rank_greater = (left_rank > right_rank);
      if (rank_greater) {
        return i1;
      }
    }
    pos = (pos + i1);
  }
  return i0;
}

export function stringMaxIndex(alphabet: Uint8Array, min_size: bigint, max_size: bigint): Uint8Array {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let size!: bigint;
  let no_members!: boolean;
  let zero!: number[];
  let top_rank!: bigint;
  let top!: bigint | null;
  let present!: boolean;
  let missing!: boolean;
  let codepoint!: bigint;
  let packed_!: number[];
  let last!: number[];
  let position!: bigint;
  let done!: boolean;
  let index!: number[];
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  size = alphabetSize(alphabet);
  no_members = (size === u0);
  if (no_members) {
    zero = Array.from(bigintZero());
    return Uint8Array.from(zero);
  }
  top_rank = ((size - u1) & MASK);
  top = alphabetShrinkCodepoint(alphabet, top_rank);
  present = (top !== null);
  missing = (!present);
  if (missing) {
    zero = Array.from(bigintZero());
    return Uint8Array.from(zero);
  }
  codepoint = top!;
  packed_ = Array.from(u32ToLe(codepoint));
  last = [];
  position = i0;
  for (;;) {
    done = (position >= max_size);
    if (done) {
      break;
    }
    last = Array.from(appendBytes(Uint8Array.from(last), Uint8Array.from(packed_)));
    position = (position + i1);
  }
  index = Array.from(stringToIndex(alphabet, min_size, Uint8Array.from(last)));
  return Uint8Array.from(index);
}

export function stringFromIndex(alphabet: Uint8Array, min_size: bigint, max_size: bigint, index_raw: Uint8Array): Uint8Array | null {
  let i0!: bigint;
  let i1!: bigint;
  let i8!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u4!: bigint;
  let u8!: bigint;
  let u255!: bigint;
  let size!: bigint;
  let no_members!: boolean;
  let none!: Uint8Array | null;
  let remaining!: number[];
  let remaining_n!: bigint;
  let remaining_bits!: bigint;
  let narrow!: boolean;
  let several!: boolean;
  let first_bucket!: boolean;
  let bucket!: number[];
  let build_bucket!: boolean;
  let scale!: bigint;
  let done!: boolean;
  let length!: bigint;
  let past_end!: boolean;
  let bucket_cmp!: bigint;
  let inside_bucket!: boolean;
  let ranks!: number[];
  let pos!: bigint;
  let rank!: bigint;
  let rank_byte!: bigint;
  let packed_all!: boolean;
  let rank_low!: bigint;
  let out!: number[];
  let found!: bigint | null;
  let present!: boolean;
  let codepoint!: bigint;
  let codepoint_byte!: bigint;
  let codepoint_low!: bigint;
  let some!: Uint8Array | null;
  i0 = 0n;
  i1 = 1n;
  i8 = 8n;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u4 = 4n;
  u8 = 8n;
  u255 = 255n;
  size = alphabetSize(alphabet);
  no_members = (size === u0);
  if (no_members) {
    none = null;
    return none;
  }
  remaining = Array.from(signedAbsLe(index_raw));
  remaining_n = blen(remaining);
  remaining_bits = (remaining_n * i8);
  narrow = (remaining_bits <= min_size);
  several = (size >= u2);
  first_bucket = (narrow && several);
  bucket = Array.from(bigintOne());
  build_bucket = (!first_bucket);
  if (build_bucket) {
    scale = i0;
    for (;;) {
      done = (scale >= min_size);
      if (done) {
        break;
      }
      bucket = Array.from(positiveMulAddSmallLe(Uint8Array.from(bucket), size, u0));
      scale = (scale + i1);
    }
  }
  length = min_size;
  for (;;) {
    past_end = (length > max_size);
    if (past_end) {
      break;
    }
    bucket_cmp = signedCompareLe(Uint8Array.from(remaining), Uint8Array.from(bucket));
    inside_bucket = (bucket_cmp < i0);
    inside_bucket = (inside_bucket || first_bucket);
    if (inside_bucket) {
      ranks = [];
      pos = i0;
      for (;;) {
        done = (pos >= length);
        if (done) {
          break;
        }
        rank = positiveRemSmallLe(Uint8Array.from(remaining), size);
        rank_byte = u0;
        for (;;) {
          packed_all = (rank_byte === u4);
          if (packed_all) {
            break;
          }
          rank_low = (rank & u255);
          ranks.push(Number(rank_low & 0xffn));
          rank = (rank >> u8);
          rank_byte = ((rank_byte + u1) & MASK);
        }
        remaining = Array.from(positiveDivSmallLe(Uint8Array.from(remaining), size));
        pos = (pos + i1);
      }
      out = [];
      pos = length;
      for (;;) {
        done = (pos === i0);
        if (done) {
          break;
        }
        pos = (pos - i1);
        rank = stringCodepointAt(Uint8Array.from(ranks), pos);
        found = alphabetShrinkCodepoint(alphabet, rank);
        present = (found !== null);
        codepoint = u0;
        if (present) {
          codepoint = found!;
        }
        codepoint_byte = u0;
        for (;;) {
          packed_all = (codepoint_byte === u4);
          if (packed_all) {
            break;
          }
          codepoint_low = (codepoint & u255);
          out.push(Number(codepoint_low & 0xffn));
          codepoint = (codepoint >> u8);
          codepoint_byte = ((codepoint_byte + u1) & MASK);
        }
      }
      some = Uint8Array.from(out);
      return some;
    }
    remaining = Array.from(signedSubLe(Uint8Array.from(remaining), Uint8Array.from(bucket)));
    bucket = Array.from(positiveMulAddSmallLe(Uint8Array.from(bucket), size, u0));
    length = (length + i1);
  }
  none = null;
  return none;
}

export function choiceDeleteRange(data: Uint8Array, start_index: bigint, end_index: bigint): Uint8Array | null {
  let i4!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let stream_valid!: boolean;
  let stream_invalid!: boolean;
  let none!: Uint8Array | null;
  let count!: bigint;
  let ordered!: boolean;
  let end_valid!: boolean;
  let bounds_valid!: boolean;
  let bounds_invalid!: boolean;
  let position!: bigint;
  let index!: bigint;
  let start_offset!: bigint;
  let done!: boolean;
  let at_start!: boolean;
  let next_!: bigint;
  let empty_range!: boolean;
  let end_offset!: bigint;
  let data_end!: bigint;
  let before!: number[];
  let after!: number[];
  let removed!: bigint;
  let new_count!: bigint;
  let header!: number[];
  let with_before!: number[];
  let out!: number[];
  let some!: Uint8Array | null;
  i4 = 4n;
  u0 = 0n;
  u1 = 1n;
  stream_valid = choiceStreamValidate(data);
  stream_invalid = (!stream_valid);
  if (stream_invalid) {
    none = null;
    return none;
  }
  count = choiceStreamCount(data);
  ordered = (start_index <= end_index);
  end_valid = (end_index <= count);
  bounds_valid = (ordered && end_valid);
  bounds_invalid = (!bounds_valid);
  if (bounds_invalid) {
    none = null;
    return none;
  }
  position = i4;
  index = u0;
  start_offset = i4;
  for (;;) {
    done = (index >= end_index);
    if (done) {
      break;
    }
    at_start = (index === start_index);
    if (at_start) {
      start_offset = position;
    }
    next_ = choiceEntryEnd(data, position, u0);
    position = next_;
    index = ((index + u1) & MASK);
  }
  empty_range = (start_index === end_index);
  if (empty_range) {
    start_offset = position;
  }
  end_offset = position;
  data_end = blen(data);
  before = bslice(data, i4, start_offset);
  after = bslice(data, end_offset, data_end);
  removed = ((end_index - start_index) & MASK);
  new_count = ((count - removed) & MASK);
  header = Array.from(choiceListHeader(new_count));
  with_before = Array.from(appendBytes(Uint8Array.from(header), Uint8Array.from(before)));
  out = Array.from(appendBytes(Uint8Array.from(with_before), Uint8Array.from(after)));
  some = Uint8Array.from(out);
  return some;
}

export function choiceSwapRanges(data: Uint8Array, a_start: bigint, a_end: bigint, b_start: bigint, b_end: bigint): Uint8Array | null {
  let i4!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let stream_valid!: boolean;
  let stream_invalid!: boolean;
  let none_stream!: Uint8Array | null;
  let count!: bigint;
  let a_ordered!: boolean;
  let disjoint!: boolean;
  let b_ordered!: boolean;
  let in_range!: boolean;
  let front_ok!: boolean;
  let back_ok!: boolean;
  let bounds_valid!: boolean;
  let bounds_invalid!: boolean;
  let none_bounds!: Uint8Array | null;
  let position!: bigint;
  let index!: bigint;
  let a_start_offset!: bigint;
  let a_end_offset!: bigint;
  let b_start_offset!: bigint;
  let done!: boolean;
  let at_a_start!: boolean;
  let at_a_end!: boolean;
  let at_b_start!: boolean;
  let next_!: bigint;
  let a_start_at_end!: boolean;
  let a_end_at_end!: boolean;
  let b_start_at_end!: boolean;
  let b_end_offset!: bigint;
  let data_end!: bigint;
  let before!: number[];
  let first!: number[];
  let middle!: number[];
  let second!: number[];
  let after!: number[];
  let header!: number[];
  let with_before!: number[];
  let with_second!: number[];
  let with_middle!: number[];
  let with_first!: number[];
  let out!: number[];
  let some!: Uint8Array | null;
  i4 = 4n;
  u0 = 0n;
  u1 = 1n;
  stream_valid = choiceStreamValidate(data);
  stream_invalid = (!stream_valid);
  if (stream_invalid) {
    none_stream = null;
    return none_stream;
  }
  count = choiceStreamCount(data);
  a_ordered = (a_start <= a_end);
  disjoint = (a_end <= b_start);
  b_ordered = (b_start <= b_end);
  in_range = (b_end <= count);
  front_ok = (a_ordered && disjoint);
  back_ok = (b_ordered && in_range);
  bounds_valid = (front_ok && back_ok);
  bounds_invalid = (!bounds_valid);
  if (bounds_invalid) {
    none_bounds = null;
    return none_bounds;
  }
  position = i4;
  index = u0;
  a_start_offset = i4;
  a_end_offset = i4;
  b_start_offset = i4;
  for (;;) {
    done = (index >= b_end);
    if (done) {
      break;
    }
    at_a_start = (index === a_start);
    if (at_a_start) {
      a_start_offset = position;
    }
    at_a_end = (index === a_end);
    if (at_a_end) {
      a_end_offset = position;
    }
    at_b_start = (index === b_start);
    if (at_b_start) {
      b_start_offset = position;
    }
    next_ = choiceEntryEnd(data, position, u0);
    position = next_;
    index = ((index + u1) & MASK);
  }
  a_start_at_end = (a_start === b_end);
  if (a_start_at_end) {
    a_start_offset = position;
  }
  a_end_at_end = (a_end === b_end);
  if (a_end_at_end) {
    a_end_offset = position;
  }
  b_start_at_end = (b_start === b_end);
  if (b_start_at_end) {
    b_start_offset = position;
  }
  b_end_offset = position;
  data_end = blen(data);
  before = bslice(data, i4, a_start_offset);
  first = bslice(data, a_start_offset, a_end_offset);
  middle = bslice(data, a_end_offset, b_start_offset);
  second = bslice(data, b_start_offset, b_end_offset);
  after = bslice(data, b_end_offset, data_end);
  header = Array.from(choiceListHeader(count));
  with_before = Array.from(appendBytes(Uint8Array.from(header), Uint8Array.from(before)));
  with_second = Array.from(appendBytes(Uint8Array.from(with_before), Uint8Array.from(second)));
  with_middle = Array.from(appendBytes(Uint8Array.from(with_second), Uint8Array.from(middle)));
  with_first = Array.from(appendBytes(Uint8Array.from(with_middle), Uint8Array.from(first)));
  out = Array.from(appendBytes(Uint8Array.from(with_first), Uint8Array.from(after)));
  some = Uint8Array.from(out);
  return some;
}

export function choiceDuplicateRanges(data: Uint8Array, a_start: bigint, a_end: bigint, b_start: bigint, b_end: bigint, use_a: boolean): Uint8Array | null {
  let i4!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let stream_valid!: boolean;
  let stream_invalid!: boolean;
  let none_stream!: Uint8Array | null;
  let count!: bigint;
  let a_ordered!: boolean;
  let disjoint!: boolean;
  let b_ordered!: boolean;
  let in_range!: boolean;
  let front_ok!: boolean;
  let back_ok!: boolean;
  let bounds_valid!: boolean;
  let bounds_invalid!: boolean;
  let none_bounds!: Uint8Array | null;
  let position!: bigint;
  let index!: bigint;
  let a_start_offset!: bigint;
  let a_end_offset!: bigint;
  let b_start_offset!: bigint;
  let done!: boolean;
  let at_a_start!: boolean;
  let at_a_end!: boolean;
  let at_b_start!: boolean;
  let next_!: bigint;
  let b_end_offset!: bigint;
  let data_end!: bigint;
  let before!: number[];
  let first!: number[];
  let middle!: number[];
  let second!: number[];
  let after!: number[];
  let donor!: number[];
  let donor_count!: bigint;
  let a_count!: bigint;
  let b_count!: bigint;
  let removed!: bigint;
  let base_count!: bigint;
  let twice_donor!: bigint;
  let new_count!: bigint;
  let header!: number[];
  let with_before!: number[];
  let with_first!: number[];
  let with_middle!: number[];
  let with_second!: number[];
  let out!: number[];
  let some!: Uint8Array | null;
  i4 = 4n;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  stream_valid = choiceStreamValidate(data);
  stream_invalid = (!stream_valid);
  if (stream_invalid) {
    none_stream = null;
    return none_stream;
  }
  count = choiceStreamCount(data);
  a_ordered = (a_start < a_end);
  disjoint = (a_end <= b_start);
  b_ordered = (b_start < b_end);
  in_range = (b_end <= count);
  front_ok = (a_ordered && disjoint);
  back_ok = (b_ordered && in_range);
  bounds_valid = (front_ok && back_ok);
  bounds_invalid = (!bounds_valid);
  if (bounds_invalid) {
    none_bounds = null;
    return none_bounds;
  }
  position = i4;
  index = u0;
  a_start_offset = i4;
  a_end_offset = i4;
  b_start_offset = i4;
  for (;;) {
    done = (index >= b_end);
    if (done) {
      break;
    }
    at_a_start = (index === a_start);
    if (at_a_start) {
      a_start_offset = position;
    }
    at_a_end = (index === a_end);
    if (at_a_end) {
      a_end_offset = position;
    }
    at_b_start = (index === b_start);
    if (at_b_start) {
      b_start_offset = position;
    }
    next_ = choiceEntryEnd(data, position, u0);
    position = next_;
    index = ((index + u1) & MASK);
  }
  b_end_offset = position;
  data_end = blen(data);
  before = bslice(data, i4, a_start_offset);
  first = bslice(data, a_start_offset, a_end_offset);
  middle = bslice(data, a_end_offset, b_start_offset);
  second = bslice(data, b_start_offset, b_end_offset);
  after = bslice(data, b_end_offset, data_end);
  donor = second.slice();
  donor_count = ((b_end - b_start) & MASK);
  if (use_a) {
    donor = first.slice();
    donor_count = ((a_end - a_start) & MASK);
  }
  a_count = ((a_end - a_start) & MASK);
  b_count = ((b_end - b_start) & MASK);
  removed = ((a_count + b_count) & MASK);
  base_count = ((count - removed) & MASK);
  twice_donor = ((donor_count * u2) & MASK);
  new_count = ((base_count + twice_donor) & MASK);
  header = Array.from(choiceListHeader(new_count));
  with_before = Array.from(appendBytes(Uint8Array.from(header), Uint8Array.from(before)));
  with_first = Array.from(appendBytes(Uint8Array.from(with_before), Uint8Array.from(donor)));
  with_middle = Array.from(appendBytes(Uint8Array.from(with_first), Uint8Array.from(middle)));
  with_second = Array.from(appendBytes(Uint8Array.from(with_middle), Uint8Array.from(donor)));
  out = Array.from(appendBytes(Uint8Array.from(with_second), Uint8Array.from(after)));
  some = Uint8Array.from(out);
  return some;
}

export function choiceDuplicateNestedPrefix(data: Uint8Array, outer_start: bigint, outer_end: bigint, inner_start: bigint, inner_end: bigint): Uint8Array | null {
  let i4!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let stream_valid!: boolean;
  let stream_invalid!: boolean;
  let none_stream!: Uint8Array | null;
  let count!: bigint;
  let outer_nonempty!: boolean;
  let inner_nonempty!: boolean;
  let starts_inside!: boolean;
  let ends_inside!: boolean;
  let in_range!: boolean;
  let nonempty!: boolean;
  let contained!: boolean;
  let shape_valid!: boolean;
  let bounds_valid!: boolean;
  let bounds_invalid!: boolean;
  let none_bounds!: Uint8Array | null;
  let position!: bigint;
  let index!: bigint;
  let outer_offset!: bigint;
  let done!: boolean;
  let at_outer!: boolean;
  let next_!: bigint;
  let same_start!: boolean;
  let inner_offset!: bigint;
  let data_end!: bigint;
  let before_inner!: number[];
  let from_outer!: number[];
  let prefix_count!: bigint;
  let new_count!: bigint;
  let header!: number[];
  let with_before!: number[];
  let out!: number[];
  let some!: Uint8Array | null;
  i4 = 4n;
  u0 = 0n;
  u1 = 1n;
  stream_valid = choiceStreamValidate(data);
  stream_invalid = (!stream_valid);
  if (stream_invalid) {
    none_stream = null;
    return none_stream;
  }
  count = choiceStreamCount(data);
  outer_nonempty = (outer_start < outer_end);
  inner_nonempty = (inner_start < inner_end);
  starts_inside = (outer_start <= inner_start);
  ends_inside = (inner_end <= outer_end);
  in_range = (outer_end <= count);
  nonempty = (outer_nonempty && inner_nonempty);
  contained = (starts_inside && ends_inside);
  shape_valid = (nonempty && contained);
  bounds_valid = (shape_valid && in_range);
  bounds_invalid = (!bounds_valid);
  if (bounds_invalid) {
    none_bounds = null;
    return none_bounds;
  }
  position = i4;
  index = u0;
  outer_offset = i4;
  for (;;) {
    done = (index >= inner_start);
    if (done) {
      break;
    }
    at_outer = (index === outer_start);
    if (at_outer) {
      outer_offset = position;
    }
    next_ = choiceEntryEnd(data, position, u0);
    position = next_;
    index = ((index + u1) & MASK);
  }
  same_start = (outer_start === inner_start);
  if (same_start) {
    outer_offset = position;
  }
  inner_offset = position;
  data_end = blen(data);
  before_inner = bslice(data, i4, inner_offset);
  from_outer = bslice(data, outer_offset, data_end);
  prefix_count = ((inner_start - outer_start) & MASK);
  new_count = ((count + prefix_count) & MASK);
  header = Array.from(choiceListHeader(new_count));
  with_before = Array.from(appendBytes(Uint8Array.from(header), Uint8Array.from(before_inner)));
  out = Array.from(appendBytes(Uint8Array.from(with_before), Uint8Array.from(from_outer)));
  some = Uint8Array.from(out);
  return some;
}

export function choiceMutateRanges(data: Uint8Array, a_start: bigint, a_end: bigint, b_start: bigint, b_end: bigint, use_a: boolean): Uint8Array | null {
  let a_before_b!: boolean;
  let b_ends_in_a!: boolean;
  let a_contains_b!: boolean;
  let nested_a!: Uint8Array | null;
  let b_before_a!: boolean;
  let a_ends_in_b!: boolean;
  let b_contains_a!: boolean;
  let nested_b!: Uint8Array | null;
  let duplicate_ab!: Uint8Array | null;
  let use_b!: boolean;
  let duplicate_ba!: Uint8Array | null;
  a_before_b = (a_start <= b_start);
  b_ends_in_a = (b_end <= a_end);
  a_contains_b = (a_before_b && b_ends_in_a);
  if (a_contains_b) {
    nested_a = choiceDuplicateNestedPrefix(data, a_start, a_end, b_start, b_end);
    return nested_a;
  }
  b_before_a = (b_start <= a_start);
  a_ends_in_b = (a_end <= b_end);
  b_contains_a = (b_before_a && a_ends_in_b);
  if (b_contains_a) {
    nested_b = choiceDuplicateNestedPrefix(data, b_start, b_end, a_start, a_end);
    return nested_b;
  }
  if (a_before_b) {
    duplicate_ab = choiceDuplicateRanges(data, a_start, a_end, b_start, b_end, use_a);
    return duplicate_ab;
  }
  use_b = (!use_a);
  duplicate_ba = choiceDuplicateRanges(data, b_start, b_end, a_start, a_end, use_b);
  return duplicate_ba;
}

export function cloneInnerStream(data: Uint8Array, offset: bigint): Uint8Array | null {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u5!: bigint;
  let n!: bigint;
  let at!: bigint;
  let past_end!: boolean;
  let none!: Uint8Array | null;
  let tag!: bigint;
  let not_clone!: boolean;
  let end_!: bigint;
  let malformed!: boolean;
  let payload_start!: bigint;
  let inner!: number[];
  let some!: Uint8Array | null;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u5 = 5n;
  n = blen(data);
  at = BigInt.asIntN(64, offset);
  past_end = (at >= n);
  if (past_end) {
    none = null;
    return none;
  }
  tag = bget(data, at);
  not_clone = (tag !== u5);
  if (not_clone) {
    none = null;
    return none;
  }
  end_ = choiceEntryEnd(data, at, u0);
  malformed = (end_ === i0);
  if (malformed) {
    none = null;
    return none;
  }
  payload_start = (at + i1);
  inner = bslice(data, payload_start, end_);
  some = Uint8Array.from(inner);
  return some;
}

export function cloneReplaceInner(data: Uint8Array, offset: bigint, inner: Uint8Array): Uint8Array | null {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u5!: bigint;
  let n!: bigint;
  let at!: bigint;
  let past_end!: boolean;
  let none!: Uint8Array | null;
  let tag!: bigint;
  let not_clone!: boolean;
  let inner_valid!: boolean;
  let inner_invalid!: boolean;
  let end_!: bigint;
  let malformed!: boolean;
  let prefix_end!: bigint;
  let head!: number[];
  let tail!: number[];
  let out!: number[];
  let with_head!: number[];
  let with_inner!: number[];
  let rebuilt!: number[];
  let some!: Uint8Array | null;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u5 = 5n;
  n = blen(data);
  at = BigInt.asIntN(64, offset);
  past_end = (at >= n);
  if (past_end) {
    none = null;
    return none;
  }
  tag = bget(data, at);
  not_clone = (tag !== u5);
  if (not_clone) {
    none = null;
    return none;
  }
  inner_valid = choiceStreamValidate(inner);
  inner_invalid = (!inner_valid);
  if (inner_invalid) {
    none = null;
    return none;
  }
  end_ = choiceEntryEnd(data, at, u0);
  malformed = (end_ === i0);
  if (malformed) {
    none = null;
    return none;
  }
  prefix_end = (at + i1);
  head = bslice(data, i0, prefix_end);
  tail = bslice(data, end_, n);
  out = [];
  with_head = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(head)));
  with_inner = Array.from(appendBytes(Uint8Array.from(with_head), inner));
  rebuilt = Array.from(appendBytes(Uint8Array.from(with_inner), Uint8Array.from(tail)));
  some = Uint8Array.from(rebuilt);
  return some;
}

export function choiceOffsetAt(data: Uint8Array, index: bigint): bigint | null {
  let i0!: bigint;
  let i4!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let stream_valid!: boolean;
  let stream_invalid!: boolean;
  let none!: bigint | null;
  let count!: bigint;
  let past_end!: boolean;
  let position!: bigint;
  let seen!: bigint;
  let found!: boolean;
  let next_!: bigint;
  let malformed!: boolean;
  let offset!: bigint;
  let some!: bigint | null;
  i0 = 0n;
  i4 = 4n;
  u0 = 0n;
  u1 = 1n;
  stream_valid = choiceStreamValidate(data);
  stream_invalid = (!stream_valid);
  if (stream_invalid) {
    none = null;
    return none;
  }
  count = choiceStreamCount(data);
  past_end = (index >= count);
  if (past_end) {
    none = null;
    return none;
  }
  position = i4;
  seen = u0;
  for (;;) {
    found = (seen >= index);
    if (found) {
      break;
    }
    next_ = choiceEntryEnd(data, position, u0);
    malformed = (next_ === i0);
    if (malformed) {
      none = null;
      return none;
    }
    position = next_;
    seen = ((seen + u1) & MASK);
  }
  offset = (position & MASK);
  some = offset;
  return some;
}

export function integerBoundaryEligible(candidate: bigint, min_value: bigint, max_value: bigint): boolean {
  let above_min!: boolean;
  let below_max!: boolean;
  let in_range!: boolean;
  let is_min!: boolean;
  let is_max!: boolean;
  let is_boundary!: boolean;
  let not_boundary!: boolean;
  let eligible!: boolean;
  above_min = (candidate >= min_value);
  below_max = (candidate <= max_value);
  in_range = (above_min && below_max);
  is_min = (candidate === min_value);
  is_max = (candidate === max_value);
  is_boundary = (is_min || is_max);
  not_boundary = (!is_boundary);
  eligible = (in_range && not_boundary);
  return eligible;
}

export function integerBoundaryCandidate(min_value: bigint, max_value: bigint, ordinal: bigint): bigint | null {
  let i0!: bigint;
  let i1!: bigint;
  let i2!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u63!: bigint;
  let want_min!: boolean;
  let some_min!: bigint | null;
  let seen!: bigint;
  let same_bounds!: boolean;
  let distinct_bounds!: boolean;
  let want_max!: boolean;
  let some_max!: bigint | null;
  let zero_eligible!: boolean;
  let want_zero!: boolean;
  let some_zero!: bigint | null;
  let power!: bigint;
  let iteration!: bigint;
  let done!: boolean;
  let positive_eligible!: boolean;
  let want_positive!: boolean;
  let some_positive!: bigint | null;
  let negative!: bigint;
  let negative_eligible!: boolean;
  let want_negative!: boolean;
  let some_negative!: bigint | null;
  let has_more!: boolean;
  let none!: bigint | null;
  i0 = 0n;
  i1 = 1n;
  i2 = 2n;
  u0 = 0n;
  u1 = 1n;
  u63 = 63n;
  want_min = (ordinal === u0);
  if (want_min) {
    some_min = min_value;
    return some_min;
  }
  seen = u1;
  same_bounds = (min_value === max_value);
  distinct_bounds = (!same_bounds);
  if (distinct_bounds) {
    want_max = (ordinal === seen);
    if (want_max) {
      some_max = max_value;
      return some_max;
    }
    seen = ((seen + u1) & MASK);
  }
  zero_eligible = integerBoundaryEligible(i0, min_value, max_value);
  if (zero_eligible) {
    want_zero = (ordinal === seen);
    if (want_zero) {
      some_zero = i0;
      return some_zero;
    }
    seen = ((seen + u1) & MASK);
  }
  power = i1;
  iteration = u0;
  for (;;) {
    done = (iteration >= u63);
    if (done) {
      break;
    }
    positive_eligible = integerBoundaryEligible(power, min_value, max_value);
    if (positive_eligible) {
      want_positive = (ordinal === seen);
      if (want_positive) {
        some_positive = power;
        return some_positive;
      }
      seen = ((seen + u1) & MASK);
    }
    negative = (i0 - power);
    negative_eligible = integerBoundaryEligible(negative, min_value, max_value);
    if (negative_eligible) {
      want_negative = (ordinal === seen);
      if (want_negative) {
        some_negative = negative;
        return some_negative;
      }
      seen = ((seen + u1) & MASK);
    }
    iteration = ((iteration + u1) & MASK);
    has_more = (iteration < u63);
    if (has_more) {
      power = (power * i2);
    }
  }
  none = null;
  return none;
}

export function integerSwarmIsWide(min_value: bigint, max_value: bigint): boolean {
  let min_bits!: bigint;
  let max_bits!: bigint;
  let width!: bigint;
  let u256!: bigint;
  let wide!: boolean;
  min_bits = (min_value & MASK);
  max_bits = (max_value & MASK);
  width = ((max_bits - min_bits) & MASK);
  u256 = 256n;
  wide = (width >= u256);
  return wide;
}

export function integerSwarmEndpointPermille(entropy: bigint): bigint {
  let mask!: bigint;
  let slot!: bigint;
  let u10!: bigint;
  let u41!: bigint;
  let u51!: bigint;
  let u700!: bigint;
  let u20!: bigint;
  let u3!: bigint;
  let endpoint_heavy!: boolean;
  let interesting_heavy!: boolean;
  let diffuse_heavy!: boolean;
  mask = 255n;
  slot = (entropy & mask);
  u10 = 10n;
  u41 = 41n;
  u51 = 51n;
  u700 = 700n;
  u20 = 20n;
  u3 = 3n;
  endpoint_heavy = (slot < u10);
  if (endpoint_heavy) {
    return u700;
  }
  interesting_heavy = (slot < u41);
  if (interesting_heavy) {
    return u20;
  }
  diffuse_heavy = (slot < u51);
  if (diffuse_heavy) {
    return u20;
  }
  return u3;
}

export function integerSwarmInterestingPermille(entropy: bigint): bigint {
  let mask!: bigint;
  let slot!: bigint;
  let u10!: bigint;
  let u41!: bigint;
  let u51!: bigint;
  let u100!: bigint;
  let u700!: bigint;
  let u80!: bigint;
  let endpoint_heavy!: boolean;
  let interesting_heavy!: boolean;
  let diffuse_heavy!: boolean;
  mask = 255n;
  slot = (entropy & mask);
  u10 = 10n;
  u41 = 41n;
  u51 = 51n;
  u100 = 100n;
  u700 = 700n;
  u80 = 80n;
  endpoint_heavy = (slot < u10);
  if (endpoint_heavy) {
    return u100;
  }
  interesting_heavy = (slot < u41);
  if (interesting_heavy) {
    return u700;
  }
  diffuse_heavy = (slot < u51);
  if (diffuse_heavy) {
    return u100;
  }
  return u80;
}

export function integerSwarmDiffusePermille(entropy: bigint): bigint {
  let mask!: bigint;
  let slot!: bigint;
  let u10!: bigint;
  let u41!: bigint;
  let u51!: bigint;
  let u50!: bigint;
  let u80!: bigint;
  let u700!: bigint;
  let u17!: bigint;
  let endpoint_heavy!: boolean;
  let interesting_heavy!: boolean;
  let diffuse_heavy!: boolean;
  mask = 255n;
  slot = (entropy & mask);
  u10 = 10n;
  u41 = 41n;
  u51 = 51n;
  u50 = 50n;
  u80 = 80n;
  u700 = 700n;
  u17 = 17n;
  endpoint_heavy = (slot < u10);
  if (endpoint_heavy) {
    return u50;
  }
  interesting_heavy = (slot < u41);
  if (interesting_heavy) {
    return u80;
  }
  diffuse_heavy = (slot < u51);
  if (diffuse_heavy) {
    return u700;
  }
  return u17;
}

export function integerSwarmCategory(entropy: bigint, roll: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let endpoint!: bigint;
  let in_endpoint!: boolean;
  let interesting!: bigint;
  let after_interesting!: bigint;
  let in_interesting!: boolean;
  let diffuse!: bigint;
  let after_diffuse!: bigint;
  let in_diffuse!: boolean;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  endpoint = integerSwarmEndpointPermille(entropy);
  in_endpoint = (roll < endpoint);
  if (in_endpoint) {
    return u0;
  }
  interesting = integerSwarmInterestingPermille(entropy);
  after_interesting = ((endpoint + interesting) & MASK);
  in_interesting = (roll < after_interesting);
  if (in_interesting) {
    return u1;
  }
  diffuse = integerSwarmDiffusePermille(entropy);
  after_diffuse = ((after_interesting + diffuse) & MASK);
  in_diffuse = (roll < after_diffuse);
  if (in_diffuse) {
    return u2;
  }
  return u3;
}

export function integerSwarmEndpointCandidate(min_value: bigint, max_value: bigint, ordinal: bigint): bigint | null {
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let i1!: bigint;
  let is_min!: boolean;
  let value!: bigint | null;
  let is_max!: boolean;
  let is_min_neighbor!: boolean;
  let neighbor!: bigint;
  let is_max_neighbor!: boolean;
  let none!: bigint | null;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  i1 = 1n;
  is_min = (ordinal === u0);
  if (is_min) {
    value = min_value;
    return value;
  }
  is_max = (ordinal === u1);
  if (is_max) {
    value = max_value;
    return value;
  }
  is_min_neighbor = (ordinal === u2);
  if (is_min_neighbor) {
    neighbor = (min_value + i1);
    value = neighbor;
    return value;
  }
  is_max_neighbor = (ordinal === u3);
  if (is_max_neighbor) {
    neighbor = (max_value - i1);
    value = neighbor;
    return value;
  }
  none = null;
  return none;
}

export function integerSwarmDiffuseCount(): bigint {
  let count!: bigint;
  count = 12n;
  return count;
}

export function integerSwarmDiffuseIfInRange(candidate: bigint, min_value: bigint, max_value: bigint): bigint | null {
  let above_min!: boolean;
  let below_max!: boolean;
  let eligible!: boolean;
  let value!: bigint | null;
  let none!: bigint | null;
  above_min = (candidate >= min_value);
  below_max = (candidate <= max_value);
  eligible = (above_min && below_max);
  if (eligible) {
    value = candidate;
    return value;
  }
  none = null;
  return none;
}

export function integerSwarmDiffuseCandidate(min_value: bigint, max_value: bigint, ordinal: bigint): bigint | null {
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u4!: bigint;
  let u5!: bigint;
  let u6!: bigint;
  let u7!: bigint;
  let u8!: bigint;
  let u9!: bigint;
  let u10!: bigint;
  let u11!: bigint;
  let i0!: bigint;
  let match_!: boolean;
  let candidate!: bigint;
  let value!: bigint | null;
  let m32768!: bigint;
  let m2147483648!: bigint;
  let m1000000!: bigint;
  let m1000000000!: bigint;
  let m6148914691236517205!: bigint;
  let m81985529216486895!: bigint;
  let none!: bigint | null;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u4 = 4n;
  u5 = 5n;
  u6 = 6n;
  u7 = 7n;
  u8 = 8n;
  u9 = 9n;
  u10 = 10n;
  u11 = 11n;
  i0 = 0n;
  match_ = (ordinal === u0);
  if (match_) {
    candidate = 32767n;
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  match_ = (ordinal === u1);
  if (match_) {
    m32768 = 32768n;
    candidate = (i0 - m32768);
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  match_ = (ordinal === u2);
  if (match_) {
    candidate = 2147483647n;
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  match_ = (ordinal === u3);
  if (match_) {
    m2147483648 = 2147483648n;
    candidate = (i0 - m2147483648);
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  match_ = (ordinal === u4);
  if (match_) {
    candidate = 1000000n;
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  match_ = (ordinal === u5);
  if (match_) {
    m1000000 = 1000000n;
    candidate = (i0 - m1000000);
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  match_ = (ordinal === u6);
  if (match_) {
    candidate = 1000000000n;
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  match_ = (ordinal === u7);
  if (match_) {
    m1000000000 = 1000000000n;
    candidate = (i0 - m1000000000);
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  match_ = (ordinal === u8);
  if (match_) {
    candidate = 6148914691236517205n;
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  match_ = (ordinal === u9);
  if (match_) {
    m6148914691236517205 = 6148914691236517205n;
    candidate = (i0 - m6148914691236517205);
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  match_ = (ordinal === u10);
  if (match_) {
    candidate = 81985529216486895n;
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  match_ = (ordinal === u11);
  if (match_) {
    m81985529216486895 = 81985529216486895n;
    candidate = (i0 - m81985529216486895);
    value = integerSwarmDiffuseIfInRange(candidate, min_value, max_value);
    return value;
  }
  none = null;
  return none;
}

export function integerDefaultShrinkTarget(min_value: bigint, max_value: bigint): bigint {
  let i0!: bigint;
  let at_or_below!: boolean;
  let at_or_above!: boolean;
  let contains_zero!: boolean;
  i0 = 0n;
  at_or_below = (min_value <= i0);
  at_or_above = (max_value >= i0);
  contains_zero = (at_or_below && at_or_above);
  if (contains_zero) {
    return i0;
  }
  return min_value;
}

export function textWidenedMax(min_size: bigint): bigint {
  let u15!: bigint;
  let u16!: bigint;
  let widened!: bigint;
  let below!: boolean;
  u15 = 15n;
  u16 = 16n;
  widened = ((min_size + u15) & MASK);
  below = (widened < u16);
  if (below) {
    return u16;
  }
  return widened;
}

export function integerBoundaryCount(min_value: bigint, max_value: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let ordinal!: bigint;
  let candidate!: bigint | null;
  let present!: boolean;
  let done!: boolean;
  u0 = 0n;
  u1 = 1n;
  ordinal = u0;
  for (;;) {
    candidate = integerBoundaryCandidate(min_value, max_value, ordinal);
    present = (candidate !== null);
    done = (!present);
    if (done) {
      break;
    }
    ordinal = ((ordinal + u1) & MASK);
  }
  return ordinal;
}

export function floatGenerationSpecValid(min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number): boolean {
  let false_!: boolean;
  let min_nan!: boolean;
  let max_nan!: boolean;
  let smallest_nan!: boolean;
  let zero!: number;
  let smallest_negative!: boolean;
  let ordered!: boolean;
  let simplest!: number | null;
  let usable!: boolean;
  false_ = false;
  min_nan = Number.isNaN(min_value);
  if (min_nan) {
    return false_;
  }
  max_nan = Number.isNaN(max_value);
  if (max_nan) {
    return false_;
  }
  smallest_nan = Number.isNaN(smallest_nonzero);
  if (smallest_nan) {
    return false_;
  }
  zero = 0;
  smallest_negative = (smallest_nonzero < zero);
  if (smallest_negative) {
    return false_;
  }
  ordered = signAwareLte(min_value, max_value);
  if (ordered) {
    simplest = floatSimplest(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero);
    usable = (simplest !== null);
    return usable;
  }
  return false_;
}

export function floatEntropyBelow(word: bigint, count: bigint): bigint {
  let mask!: bigint;
  let u32!: bigint;
  let word_low!: bigint;
  let word_high!: bigint;
  let count_low!: bigint;
  let count_high!: bigint;
  let low_low!: bigint;
  let low_high!: bigint;
  let high_low!: bigint;
  let high_high!: bigint;
  let carry!: bigint;
  let low_high_low!: bigint;
  let high_low_low!: bigint;
  let middle!: bigint;
  let low_high_high!: bigint;
  let high_low_high!: bigint;
  let middle_high!: bigint;
  let product!: bigint;
  mask = 4294967295n;
  u32 = 32n;
  word_low = (word & mask);
  word_high = (word >> u32);
  count_low = (count & mask);
  count_high = (count >> u32);
  low_low = ((word_low * count_low) & MASK);
  low_high = ((word_low * count_high) & MASK);
  high_low = ((word_high * count_low) & MASK);
  high_high = ((word_high * count_high) & MASK);
  carry = (low_low >> u32);
  low_high_low = (low_high & mask);
  high_low_low = (high_low & mask);
  middle = ((carry + low_high_low) & MASK);
  middle = ((middle + high_low_low) & MASK);
  low_high_high = (low_high >> u32);
  high_low_high = (high_low >> u32);
  middle_high = (middle >> u32);
  product = ((high_high + low_high_high) & MASK);
  product = ((product + high_low_high) & MASK);
  product = ((product + middle_high) & MASK);
  return product;
}

export function floatEntropyBetween(word: bigint, low: bigint, high: bigint): bigint {
  let u1!: bigint;
  let all!: bigint;
  let span!: bigint;
  let full!: boolean;
  let count!: bigint;
  let offset!: bigint;
  let value!: bigint;
  u1 = 1n;
  all = 18446744073709551615n;
  span = ((high - low) & MASK);
  full = (span === all);
  if (full) {
    return word;
  }
  count = ((span + u1) & MASK);
  offset = floatEntropyBelow(word, count);
  value = ((low + offset) & MASK);
  return value;
}

export function floatEntropyCoin(word: bigint, bit: bigint): boolean {
  let u1!: bigint;
  let shifted!: bigint;
  let low!: bigint;
  let set!: boolean;
  u1 = 1n;
  shifted = (word >> bit);
  low = (shifted & u1);
  set = (low === u1);
  return set;
}

export function floatEntropyUnit(word: bigint): number {
  let u11!: bigint;
  let scale_bits!: bigint;
  let top!: bigint;
  let integer!: number;
  let scale!: number;
  let unit!: number;
  u11 = 11n;
  scale_bits = 4368491638549381120n;
  top = (word >> u11);
  integer = Number(top);
  scale = bits2f(scale_bits);
  unit = (integer * scale);
  return unit;
}

export function floatLogUniformMagnitude(low: number, high: number, exponent_word: bigint, mantissa_word: bigint): number {
  let u0!: bigint;
  let u52!: bigint;
  let mantissa_mask!: bigint;
  let low_bits!: bigint;
  let high_bits!: bigint;
  let low_exponent!: bigint;
  let high_exponent!: bigint;
  let exponent!: bigint;
  let mantissa_low!: bigint;
  let at_low!: boolean;
  let mantissa_high!: bigint;
  let at_high!: boolean;
  let mantissa!: bigint;
  let exponent_field!: bigint;
  let bits!: bigint;
  let magnitude!: number;
  u0 = 0n;
  u52 = 52n;
  mantissa_mask = 4503599627370495n;
  low_bits = f2bits(low);
  high_bits = f2bits(high);
  low_exponent = (low_bits >> u52);
  high_exponent = (high_bits >> u52);
  exponent = floatEntropyBetween(exponent_word, low_exponent, high_exponent);
  mantissa_low = u0;
  at_low = (exponent === low_exponent);
  if (at_low) {
    mantissa_low = (low_bits & mantissa_mask);
  }
  mantissa_high = mantissa_mask;
  at_high = (exponent === high_exponent);
  if (at_high) {
    mantissa_high = (high_bits & mantissa_mask);
  }
  mantissa = floatEntropyBetween(mantissa_word, mantissa_low, mantissa_high);
  exponent_field = ((exponent << u52) & MASK);
  bits = (exponent_field | mantissa);
  magnitude = bits2f(bits);
  return magnitude;
}

export function floatBitLength(value: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let rest!: bigint;
  let length!: bigint;
  let done!: boolean;
  u0 = 0n;
  u1 = 1n;
  rest = value;
  length = u0;
  for (;;) {
    done = (rest === u0);
    if (done) {
      break;
    }
    rest = (rest >> u1);
    length = ((length + u1) & MASK);
  }
  return length;
}

export function floatLogUniformInteger(low: bigint, high: bigint, binade_word: bigint, value_word: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let low_length!: bigint;
  let high_length!: bigint;
  let length!: bigint;
  let first!: bigint;
  let last!: bigint;
  let nonzero!: boolean;
  let shift!: bigint;
  let below_first!: bigint;
  let from_!: bigint;
  let low_above!: boolean;
  let to!: bigint;
  let high_below!: boolean;
  let value!: bigint;
  u0 = 0n;
  u1 = 1n;
  low_length = floatBitLength(low);
  high_length = floatBitLength(high);
  length = floatEntropyBetween(binade_word, low_length, high_length);
  first = u0;
  last = u0;
  nonzero = (length > u0);
  if (nonzero) {
    shift = ((length - u1) & MASK);
    first = ((u1 << shift) & MASK);
    below_first = ((first - u1) & MASK);
    last = ((first + below_first) & MASK);
  }
  from_ = first;
  low_above = (low > from_);
  if (low_above) {
    from_ = low;
  }
  to = last;
  high_below = (high < to);
  if (high_below) {
    to = high;
  }
  value = floatEntropyBetween(value_word, from_, to);
  return value;
}

export function f64NextUp(value: number): number {
  let u1!: bigint;
  let zero!: number;
  let is_nan!: boolean;
  let infinity!: number;
  let at_top!: boolean;
  let is_zero!: boolean;
  let smallest!: number;
  let bits!: bigint;
  let negative!: boolean;
  let lower!: bigint;
  let toward_zero!: number;
  let higher!: bigint;
  let away!: number;
  u1 = 1n;
  zero = 0;
  is_nan = Number.isNaN(value);
  if (is_nan) {
    return value;
  }
  infinity = f64Infinity();
  at_top = (value === infinity);
  if (at_top) {
    return value;
  }
  is_zero = (value === zero);
  if (is_zero) {
    smallest = bits2f(u1);
    return smallest;
  }
  bits = f2bits(value);
  negative = signbit(value);
  if (negative) {
    lower = ((bits - u1) & MASK);
    toward_zero = bits2f(lower);
    return toward_zero;
  }
  higher = ((bits + u1) & MASK);
  away = bits2f(higher);
  return away;
}

export function f64NextDown(value: number): number {
  let negated!: number;
  let up!: number;
  let down!: number;
  negated = f64Neg(value);
  up = f64NextUp(negated);
  down = f64Neg(up);
  return down;
}

export function f64Floor(value: number): number {
  let one!: number;
  let ceiling!: number;
  let integral!: boolean;
  let floor!: number;
  one = 1;
  ceiling = Math.ceil(value);
  integral = (ceiling === value);
  if (integral) {
    return ceiling;
  }
  floor = (ceiling - one);
  return floor;
}

export function floatCategoryIsPoint(category: bigint): boolean {
  let u9!: bigint;
  let u13!: bigint;
  let from_nan!: boolean;
  let to_zero!: boolean;
  let point!: boolean;
  u9 = 9n;
  u13 = 13n;
  from_nan = (category >= u9);
  to_zero = (category <= u13);
  point = (from_nan && to_zero);
  return point;
}

export function floatSwarmWeight(entropy: bigint, category: bigint): bigint {
  let u0!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u4!: bigint;
  let u8!: bigint;
  let u12!: bigint;
  let u15!: bigint;
  let u16!: bigint;
  let u17!: bigint;
  let u34!: bigint;
  let u50!: bigint;
  let u52!: bigint;
  let u64!: bigint;
  let u150!: bigint;
  let u200!: bigint;
  let u255!: bigint;
  let u541!: bigint;
  let u1000!: bigint;
  let out_of_range!: boolean;
  let is_default!: boolean;
  let point!: boolean;
  let slot!: bigint;
  let ordinary!: boolean;
  let focus_field!: bigint;
  let focus!: bigint;
  let level_field!: bigint;
  let level_step!: bigint;
  let level_rise!: bigint;
  let level!: bigint;
  let floor!: bigint;
  let focus_point!: boolean;
  let claimed!: bigint;
  let rest!: bigint;
  let is_focus!: boolean;
  u0 = 0n;
  u2 = 2n;
  u3 = 3n;
  u4 = 4n;
  u8 = 8n;
  u12 = 12n;
  u15 = 15n;
  u16 = 16n;
  u17 = 17n;
  u34 = 34n;
  u50 = 50n;
  u52 = 52n;
  u64 = 64n;
  u150 = 150n;
  u200 = 200n;
  u255 = 255n;
  u541 = 541n;
  u1000 = 1000n;
  out_of_range = (category > u16);
  if (out_of_range) {
    return u0;
  }
  is_default = (category === u16);
  point = floatCategoryIsPoint(category);
  slot = (entropy & u255);
  ordinary = (slot >= u64);
  if (ordinary) {
    if (is_default) {
      return u541;
    }
    if (point) {
      return u17;
    }
    return u34;
  }
  focus_field = (entropy >> u8);
  focus = (focus_field & u15);
  level_field = (entropy >> u12);
  level_step = (level_field & u3);
  level_rise = ((level_step * u150) & MASK);
  level = ((u200 + level_rise) & MASK);
  if (is_default) {
    floor = u50;
    focus_point = floatCategoryIsPoint(focus);
    if (focus_point) {
      floor = u52;
    }
    claimed = ((level + floor) & MASK);
    rest = ((u1000 - claimed) & MASK);
    return rest;
  }
  is_focus = (category === focus);
  if (is_focus) {
    return level;
  }
  if (point) {
    return u2;
  }
  return u4;
}

export function floatSwarmTotal(entropy: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let u17!: bigint;
  let total!: bigint;
  let category!: bigint;
  let done!: boolean;
  let weight!: bigint;
  u0 = 0n;
  u1 = 1n;
  u17 = 17n;
  total = u0;
  category = u0;
  for (;;) {
    done = (category >= u17);
    if (done) {
      break;
    }
    weight = floatSwarmWeight(entropy, category);
    total = ((total + weight) & MASK);
    category = ((category + u1) & MASK);
  }
  return total;
}

export function floatSwarmRollSpan(): bigint {
  let span!: bigint;
  span = 1000n;
  return span;
}

export function floatSwarmCategory(entropy: bigint, roll: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let u16!: bigint;
  let reached!: bigint;
  let category!: bigint;
  let done!: boolean;
  let weight!: bigint;
  let inside!: boolean;
  u0 = 0n;
  u1 = 1n;
  u16 = 16n;
  reached = u0;
  category = u0;
  for (;;) {
    done = (category >= u16);
    if (done) {
      break;
    }
    weight = floatSwarmWeight(entropy, category);
    reached = ((reached + weight) & MASK);
    inside = (roll < reached);
    if (inside) {
      return category;
    }
    category = ((category + u1) & MASK);
  }
  return u16;
}

export function floatSideLow(min_value: number, max_value: number, smallest_nonzero: number, negative: boolean): number {
  let u1!: bigint;
  let low!: number;
  let under_smallest!: boolean;
  let tiniest!: number;
  let under_tiniest!: boolean;
  u1 = 1n;
  low = min_value;
  if (negative) {
    low = f64Neg(max_value);
  }
  under_smallest = (low < smallest_nonzero);
  if (under_smallest) {
    low = smallest_nonzero;
  }
  tiniest = bits2f(u1);
  under_tiniest = (low < tiniest);
  if (under_tiniest) {
    low = tiniest;
  }
  return low;
}

export function floatSideHigh(min_value: number, max_value: number, negative: boolean): number {
  let high!: number;
  let largest!: number;
  let over_largest!: boolean;
  high = max_value;
  if (negative) {
    high = f64Neg(min_value);
  }
  largest = f64Max();
  over_largest = (high > largest);
  if (over_largest) {
    high = largest;
  }
  return high;
}

export function floatMagnitudeSample(category: bigint, low: number, high: number, coins: bigint, first: bigint, second: bigint): number | null {
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u4!: bigint;
  let u5!: bigint;
  let u6!: bigint;
  let u7!: bigint;
  let u8!: bigint;
  let u14!: bigint;
  let u16!: bigint;
  let u52!: bigint;
  let mantissa_mask!: bigint;
  let none!: number | null;
  let band_low!: number;
  let band_high!: number;
  let banded!: boolean;
  let near_zero!: boolean;
  let bits_low!: bigint;
  let bits_high!: bigint;
  let subnormal!: boolean;
  let near_max_for_add!: boolean;
  let near_max_for_mul!: boolean;
  let near_sqrt_min_positive!: boolean;
  let whole_side!: boolean;
  let from_!: number;
  let band_above!: boolean;
  let to!: number;
  let band_below!: boolean;
  let empty!: boolean;
  let magnitude!: number;
  let found!: number | null;
  let low_bits!: bigint;
  let high_bits!: bigint;
  let near_one!: boolean;
  let one_bits!: bigint;
  let mantissa_bits!: bigint;
  let closeness!: bigint;
  let span_shift!: bigint;
  let span!: bigint;
  let above_from!: bigint;
  let low_over_one!: boolean;
  let above_end!: bigint;
  let above_to!: bigint;
  let high_under_above!: boolean;
  let double_span!: bigint;
  let below_reach!: bigint;
  let below_from!: bigint;
  let low_over_below!: boolean;
  let below_to!: bigint;
  let high_under_below!: boolean;
  let above_open!: boolean;
  let below_open!: boolean;
  let below_first!: boolean;
  let take_below!: boolean;
  let above_first!: boolean;
  let prefer_above!: boolean;
  let above_only!: boolean;
  let bits!: bigint;
  let value!: number;
  let integer!: boolean;
  let one!: number;
  let limit_bits!: bigint;
  let limit!: number;
  let under_one!: boolean;
  let over_limit!: boolean;
  let from_integer!: bigint;
  let to_integer!: bigint;
  let picked!: bigint;
  let half_integer!: boolean;
  let zero!: number;
  let half!: number;
  let low_less_half!: number;
  let under_zero!: boolean;
  let high_less_half!: number;
  let whole!: number;
  let binade_edge!: boolean;
  let low_exponent!: bigint;
  let low_mantissa!: bigint;
  let from_exponent!: bigint;
  let subnormal_low!: boolean;
  let inside_binade!: boolean;
  let past_power!: boolean;
  let to_exponent!: bigint;
  let exponent!: bigint;
  let power!: bigint;
  let predecessor!: bigint;
  let want_predecessor!: boolean;
  let predecessor_in_range!: boolean;
  let use_predecessor!: boolean;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u4 = 4n;
  u5 = 5n;
  u6 = 6n;
  u7 = 7n;
  u8 = 8n;
  u14 = 14n;
  u16 = 16n;
  u52 = 52n;
  mantissa_mask = 4503599627370495n;
  none = null;
  band_low = low;
  band_high = high;
  banded = false;
  near_zero = (category === u1);
  if (near_zero) {
    bits_low = 4503599627370496n;
    bits_high = 4591870180066957721n;
    band_low = bits2f(bits_low);
    band_high = bits2f(bits_high);
    banded = true;
  }
  subnormal = (category === u2);
  if (subnormal) {
    band_low = bits2f(u1);
    band_high = bits2f(mantissa_mask);
    banded = true;
  }
  near_max_for_add = (category === u6);
  if (near_max_for_add) {
    bits_low = 9214364837600034816n;
    band_low = bits2f(bits_low);
    band_high = f64Max();
    banded = true;
  }
  near_max_for_mul = (category === u7);
  if (near_max_for_mul) {
    bits_low = 6908521828386340864n;
    bits_high = 6917529027641081855n;
    band_low = bits2f(bits_low);
    band_high = bits2f(bits_high);
    banded = true;
  }
  near_sqrt_min_positive = (category === u8);
  if (near_sqrt_min_positive) {
    bits_low = 2296835809958952960n;
    bits_high = 2310346608841064447n;
    band_low = bits2f(bits_low);
    band_high = bits2f(bits_high);
    banded = true;
  }
  whole_side = (category === u16);
  if (whole_side) {
    banded = true;
  }
  if (banded) {
    from_ = low;
    band_above = (band_low > from_);
    if (band_above) {
      from_ = band_low;
    }
    to = high;
    band_below = (band_high < to);
    if (band_below) {
      to = band_high;
    }
    empty = (from_ > to);
    if (empty) {
      return none;
    }
    magnitude = floatLogUniformMagnitude(from_, to, first, second);
    found = magnitude;
    return found;
  }
  low_bits = f2bits(low);
  high_bits = f2bits(high);
  near_one = (category === u3);
  if (near_one) {
    one_bits = 4607182418800017408n;
    mantissa_bits = 52n;
    closeness = floatEntropyBetween(first, u1, mantissa_bits);
    span_shift = ((mantissa_bits - closeness) & MASK);
    span = ((u1 << span_shift) & MASK);
    above_from = one_bits;
    low_over_one = (low_bits > above_from);
    if (low_over_one) {
      above_from = low_bits;
    }
    above_end = ((one_bits + span) & MASK);
    above_to = ((above_end - u1) & MASK);
    high_under_above = (high_bits < above_to);
    if (high_under_above) {
      above_to = high_bits;
    }
    double_span = ((span + span) & MASK);
    below_reach = ((double_span - u1) & MASK);
    below_from = ((one_bits - below_reach) & MASK);
    low_over_below = (low_bits > below_from);
    if (low_over_below) {
      below_from = low_bits;
    }
    below_to = ((one_bits - u1) & MASK);
    high_under_below = (high_bits < below_to);
    if (high_under_below) {
      below_to = high_bits;
    }
    above_open = (above_from <= above_to);
    below_open = (below_from <= below_to);
    below_first = floatEntropyCoin(coins, u1);
    take_below = below_open;
    above_first = (!below_first);
    prefer_above = (above_first && above_open);
    if (prefer_above) {
      take_below = false;
    }
    above_only = (!below_open);
    if (above_only) {
      take_below = false;
    }
    if (take_below) {
      bits = floatEntropyBetween(second, below_from, below_to);
      value = bits2f(bits);
      found = value;
      return found;
    }
    if (above_open) {
      bits = floatEntropyBetween(second, above_from, above_to);
      value = bits2f(bits);
      found = value;
      return found;
    }
    return none;
  }
  integer = (category === u4);
  if (integer) {
    one = 1;
    limit_bits = 4845873199050653696n;
    limit = bits2f(limit_bits);
    from_ = Math.ceil(low);
    under_one = (from_ < one);
    if (under_one) {
      from_ = one;
    }
    to = f64Floor(high);
    over_limit = (to > limit);
    if (over_limit) {
      to = limit;
    }
    empty = (from_ > to);
    if (empty) {
      return none;
    }
    from_integer = f64ToU64(from_);
    to_integer = f64ToU64(to);
    picked = floatLogUniformInteger(from_integer, to_integer, first, second);
    value = Number(picked);
    found = value;
    return found;
  }
  half_integer = (category === u5);
  if (half_integer) {
    zero = 0;
    half = 0.5;
    limit_bits = 4841369599423283198n;
    limit = bits2f(limit_bits);
    low_less_half = (low - half);
    from_ = Math.ceil(low_less_half);
    under_zero = (from_ < zero);
    if (under_zero) {
      from_ = zero;
    }
    high_less_half = (high - half);
    to = f64Floor(high_less_half);
    over_limit = (to > limit);
    if (over_limit) {
      to = limit;
    }
    empty = (from_ > to);
    if (empty) {
      return none;
    }
    from_integer = f64ToU64(from_);
    to_integer = f64ToU64(to);
    picked = floatLogUniformInteger(from_integer, to_integer, first, second);
    whole = Number(picked);
    value = (whole + half);
    found = value;
    return found;
  }
  binade_edge = (category === u14);
  if (binade_edge) {
    low_exponent = (low_bits >> u52);
    low_mantissa = (low_bits & mantissa_mask);
    from_exponent = low_exponent;
    subnormal_low = (low_exponent === u0);
    inside_binade = (low_mantissa !== u0);
    past_power = (subnormal_low || inside_binade);
    if (past_power) {
      from_exponent = ((low_exponent + u1) & MASK);
    }
    to_exponent = (high_bits >> u52);
    empty = (from_exponent > to_exponent);
    if (empty) {
      return none;
    }
    exponent = floatEntropyBetween(first, from_exponent, to_exponent);
    power = ((exponent << u52) & MASK);
    bits = power;
    predecessor = ((power - u1) & MASK);
    want_predecessor = floatEntropyCoin(coins, u1);
    predecessor_in_range = (predecessor >= low_bits);
    use_predecessor = (want_predecessor && predecessor_in_range);
    if (use_predecessor) {
      bits = predecessor;
    }
    value = bits2f(bits);
    found = value;
    return found;
  }
  return none;
}

export function floatSignedSample(category: bigint, min_value: number, max_value: number, smallest_nonzero: number, coins: bigint, first: bigint, second: bigint): number | null {
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let negative!: boolean;
  let tried!: bigint;
  let done!: boolean;
  let low!: number;
  let high!: number;
  let open!: boolean;
  let magnitude!: number | null;
  let present!: boolean;
  let value!: number;
  let found!: number | null;
  let none!: number | null;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  negative = floatEntropyCoin(coins, u0);
  tried = u0;
  for (;;) {
    done = (tried >= u2);
    if (done) {
      break;
    }
    low = floatSideLow(min_value, max_value, smallest_nonzero, negative);
    high = floatSideHigh(min_value, max_value, negative);
    open = (low <= high);
    if (open) {
      magnitude = floatMagnitudeSample(category, low, high, coins, first, second);
      present = (magnitude !== null);
      if (present) {
        value = magnitude!;
        if (negative) {
          value = f64Neg(value);
        }
        found = value;
        return found;
      }
    }
    negative = (!negative);
    tried = ((tried + u1) & MASK);
  }
  none = null;
  return none;
}

export function floatPointOptionCount(category: bigint): bigint {
  let u0!: bigint;
  let u2!: bigint;
  let u6!: bigint;
  let u10!: bigint;
  let u13!: bigint;
  let endpoint!: boolean;
  let from_infinity!: boolean;
  let to_zero!: boolean;
  let paired!: boolean;
  u0 = 0n;
  u2 = 2n;
  u6 = 6n;
  u10 = 10n;
  u13 = 13n;
  endpoint = (category === u0);
  if (endpoint) {
    return u6;
  }
  from_infinity = (category >= u10);
  to_zero = (category <= u13);
  paired = (from_infinity && to_zero);
  if (paired) {
    return u2;
  }
  return u0;
}

export function floatPointOption(category: bigint, min_value: number, max_value: number, index: bigint): number {
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u4!: bigint;
  let u10!: bigint;
  let u11!: bigint;
  let u12!: bigint;
  let one!: number;
  let endpoint!: boolean;
  let want_min!: boolean;
  let want_max!: boolean;
  let want_above_min!: boolean;
  let above_min!: number;
  let want_min_plus_one!: boolean;
  let min_plus_one!: number;
  let want_max_less_one!: boolean;
  let max_less_one!: number;
  let below_max!: number;
  let magnitude!: number;
  let infinity!: boolean;
  let max_magnitude!: boolean;
  let max_exact_integer!: boolean;
  let limit_bits!: bigint;
  let negative!: boolean;
  let negated!: number;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u4 = 4n;
  u10 = 10n;
  u11 = 11n;
  u12 = 12n;
  one = 1;
  endpoint = (category === u0);
  if (endpoint) {
    want_min = (index === u0);
    if (want_min) {
      return min_value;
    }
    want_max = (index === u1);
    if (want_max) {
      return max_value;
    }
    want_above_min = (index === u2);
    if (want_above_min) {
      above_min = f64NextUp(min_value);
      return above_min;
    }
    want_min_plus_one = (index === u3);
    if (want_min_plus_one) {
      min_plus_one = (min_value + one);
      return min_plus_one;
    }
    want_max_less_one = (index === u4);
    if (want_max_less_one) {
      max_less_one = (max_value - one);
      return max_less_one;
    }
    below_max = f64NextDown(max_value);
    return below_max;
  }
  magnitude = 0;
  infinity = (category === u10);
  if (infinity) {
    magnitude = f64Infinity();
  }
  max_magnitude = (category === u11);
  if (max_magnitude) {
    magnitude = f64Max();
  }
  max_exact_integer = (category === u12);
  if (max_exact_integer) {
    limit_bits = 4845873199050653696n;
    magnitude = bits2f(limit_bits);
  }
  negative = (index === u1);
  if (negative) {
    negated = f64Neg(magnitude);
    return negated;
  }
  return magnitude;
}

export function floatPointOptionAdmitted(category: bigint, min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number, index: bigint): boolean {
  let u0!: bigint;
  let u1!: bigint;
  let false_!: boolean;
  let option!: number;
  let valid!: boolean;
  let invalid!: boolean;
  let option_bits!: bigint;
  let earlier!: bigint;
  let done!: boolean;
  let previous!: number;
  let previous_bits!: bigint;
  let repeat!: boolean;
  let true_!: boolean;
  u0 = 0n;
  u1 = 1n;
  false_ = false;
  option = floatPointOption(category, min_value, max_value, index);
  valid = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, option);
  invalid = (!valid);
  if (invalid) {
    return false_;
  }
  option_bits = f2bits(option);
  earlier = u0;
  for (;;) {
    done = (earlier >= index);
    if (done) {
      break;
    }
    previous = floatPointOption(category, min_value, max_value, earlier);
    previous_bits = f2bits(previous);
    repeat = (previous_bits === option_bits);
    if (repeat) {
      return false_;
    }
    earlier = ((earlier + u1) & MASK);
  }
  true_ = true;
  return true_;
}

export function floatPointCandidate(category: bigint, min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number, word: bigint): number | null {
  let u0!: bigint;
  let u1!: bigint;
  let count!: bigint;
  let admitted!: bigint;
  let index!: bigint;
  let done!: boolean;
  let admit!: boolean;
  let none!: number | null;
  let nothing!: boolean;
  let wanted!: bigint;
  let seen!: bigint;
  let hit!: boolean;
  let option!: number;
  let found!: number | null;
  u0 = 0n;
  u1 = 1n;
  count = floatPointOptionCount(category);
  admitted = u0;
  index = u0;
  for (;;) {
    done = (index >= count);
    if (done) {
      break;
    }
    admit = floatPointOptionAdmitted(category, min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, index);
    if (admit) {
      admitted = ((admitted + u1) & MASK);
    }
    index = ((index + u1) & MASK);
  }
  none = null;
  nothing = (admitted === u0);
  if (nothing) {
    return none;
  }
  wanted = floatEntropyBelow(word, admitted);
  seen = u0;
  index = u0;
  for (;;) {
    done = (index >= count);
    if (done) {
      break;
    }
    admit = floatPointOptionAdmitted(category, min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, index);
    if (admit) {
      hit = (seen === wanted);
      if (hit) {
        option = floatPointOption(category, min_value, max_value, index);
        found = option;
        return found;
      }
      seen = ((seen + u1) & MASK);
    }
    index = ((index + u1) & MASK);
  }
  return none;
}

export function floatNanCandidate(allow_nan: boolean, coins: bigint, first: bigint): number | null {
  let u1!: bigint;
  let u63!: bigint;
  let exponent_field!: bigint;
  let quiet!: bigint;
  let refused!: boolean;
  let none!: number | null;
  let sign_bit!: bigint;
  let sign!: bigint;
  let payload!: bigint;
  let canonical!: boolean;
  let random!: boolean;
  let payload_top!: bigint;
  let low_payload!: bigint;
  let bits!: bigint;
  let value!: number;
  let found!: number | null;
  u1 = 1n;
  u63 = 63n;
  exponent_field = 9218868437227405312n;
  quiet = 2251799813685248n;
  refused = (!allow_nan);
  if (refused) {
    none = null;
    return none;
  }
  sign_bit = (coins & u1);
  sign = ((sign_bit << u63) & MASK);
  payload = quiet;
  canonical = floatEntropyCoin(coins, u1);
  random = (!canonical);
  if (random) {
    payload_top = ((quiet - u1) & MASK);
    low_payload = floatEntropyBetween(first, u1, payload_top);
    payload = (quiet | low_payload);
  }
  bits = (sign | exponent_field);
  bits = (bits | payload);
  value = bits2f(bits);
  found = value;
  return found;
}

export function floatOddDenominator(word: bigint): bigint {
  let u1!: bigint;
  let u500!: bigint;
  let half!: bigint;
  let double_!: bigint;
  let odd!: bigint;
  u1 = 1n;
  u500 = 500n;
  half = floatEntropyBetween(word, u1, u500);
  double_ = ((half + half) & MASK);
  odd = ((double_ + u1) & MASK);
  return odd;
}

export function floatDivides(numerator: number, denominator: number): boolean {
  let quotient!: number;
  let ceiling!: number;
  let integral!: boolean;
  quotient = (numerator / denominator);
  ceiling = Math.ceil(quotient);
  integral = (ceiling === quotient);
  return integral;
}

export function floatNonDyadicCandidate(min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number, coins: bigint, first: bigint, second: bigint, third: bigint, fourth: bigint): number | null {
  let u0!: bigint;
  let u1!: bigint;
  let u8!: bigint;
  let u10!: bigint;
  let u100!: bigint;
  let u300!: bigint;
  let five!: number;
  let one!: number;
  let magnitude!: number;
  let decimal!: boolean;
  let digits!: bigint;
  let scale!: bigint;
  let raised!: bigint;
  let done!: boolean;
  let numerator_top!: bigint;
  let numerator_integer!: bigint;
  let numerator!: number;
  let five_divides!: boolean;
  let denominator!: number;
  let fraction!: boolean;
  let denominator_integer!: bigint;
  let whole!: boolean;
  let negated!: number;
  let first_value!: number;
  let second_value!: number;
  let negative_first!: boolean;
  let first_valid!: boolean;
  let found!: number | null;
  let second_valid!: boolean;
  let none!: number | null;
  let size!: number;
  let size_nan!: boolean;
  let size_infinite!: boolean;
  let ratio!: number;
  let offset!: number;
  let value!: number;
  u0 = 0n;
  u1 = 1n;
  u8 = 8n;
  u10 = 10n;
  u100 = 100n;
  u300 = 300n;
  five = 5;
  one = 1;
  magnitude = 0;
  decimal = floatEntropyCoin(coins, u1);
  if (decimal) {
    digits = floatEntropyBetween(first, u1, u8);
    scale = u1;
    raised = u0;
    for (;;) {
      done = (raised >= digits);
      if (done) {
        break;
      }
      scale = ((scale * u10) & MASK);
      raised = ((raised + u1) & MASK);
    }
    numerator_top = ((scale * u100) & MASK);
    numerator_integer = floatEntropyBetween(second, u1, numerator_top);
    numerator = Number(numerator_integer);
    five_divides = floatDivides(numerator, five);
    if (five_divides) {
      numerator = (numerator + one);
    }
    denominator = Number(scale);
    magnitude = (numerator / denominator);
  }
  fraction = (!decimal);
  if (fraction) {
    denominator_integer = floatOddDenominator(first);
    numerator_integer = floatEntropyBetween(second, u1, u300);
    numerator = Number(numerator_integer);
    denominator = Number(denominator_integer);
    whole = floatDivides(numerator, denominator);
    if (whole) {
      numerator = (numerator + one);
    }
    magnitude = (numerator / denominator);
  }
  negated = f64Neg(magnitude);
  first_value = magnitude;
  second_value = negated;
  negative_first = floatEntropyCoin(coins, u0);
  if (negative_first) {
    first_value = negated;
    second_value = magnitude;
  }
  first_valid = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, first_value);
  if (first_valid) {
    found = first_value;
    return found;
  }
  second_valid = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, second_value);
  if (second_valid) {
    found = second_value;
    return found;
  }
  none = null;
  size = (max_value - min_value);
  size_nan = Number.isNaN(size);
  if (size_nan) {
    return none;
  }
  size_infinite = isInf(size);
  if (size_infinite) {
    return none;
  }
  denominator_integer = floatOddDenominator(third);
  numerator_top = ((denominator_integer - u1) & MASK);
  numerator_integer = floatEntropyBetween(fourth, u1, numerator_top);
  numerator = Number(numerator_integer);
  denominator = Number(denominator_integer);
  ratio = (numerator / denominator);
  offset = (size * ratio);
  value = (min_value + offset);
  found = value;
  return found;
}

export function floatCategoryCandidate(category: bigint, min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number, coins: bigint, first: bigint, second: bigint, third: bigint, fourth: bigint): number | null {
  let u0!: bigint;
  let u8!: bigint;
  let u9!: bigint;
  let u14!: bigint;
  let u15!: bigint;
  let candidate!: number | null;
  let options!: bigint;
  let pointed!: boolean;
  let not_endpoint!: boolean;
  let through_bands!: boolean;
  let band!: boolean;
  let binade_edge!: boolean;
  let signed_!: boolean;
  let nan!: boolean;
  let non_dyadic!: boolean;
  let present!: boolean;
  let value!: number;
  let valid!: boolean;
  let none!: number | null;
  u0 = 0n;
  u8 = 8n;
  u9 = 9n;
  u14 = 14n;
  u15 = 15n;
  candidate = null;
  options = floatPointOptionCount(category);
  pointed = (options > u0);
  if (pointed) {
    candidate = floatPointCandidate(category, min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, first);
  }
  not_endpoint = (category > u0);
  through_bands = (category <= u8);
  band = (not_endpoint && through_bands);
  binade_edge = (category === u14);
  signed_ = (band || binade_edge);
  if (signed_) {
    candidate = floatSignedSample(category, min_value, max_value, smallest_nonzero, coins, first, second);
  }
  nan = (category === u9);
  if (nan) {
    candidate = floatNanCandidate(allow_nan, coins, first);
  }
  non_dyadic = (category === u15);
  if (non_dyadic) {
    candidate = floatNonDyadicCandidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, coins, first, second, third, fourth);
  }
  present = (candidate !== null);
  if (present) {
    value = candidate!;
    valid = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, value);
    if (valid) {
      return candidate;
    }
  }
  none = null;
  return none;
}

export function floatDefaultCandidate(min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number, coins: bigint, first: bigint, second: bigint, third: bigint): number {
  let u0!: bigint;
  let u1!: bigint;
  let u16!: bigint;
  let one!: number;
  let log_uniform!: boolean;
  let sign_coins!: bigint;
  let sampled!: number | null;
  let present!: boolean;
  let value!: number;
  let valid!: boolean;
  let largest!: number;
  let lowest!: number;
  let low!: number;
  let under!: boolean;
  let high!: number;
  let over!: boolean;
  let unit!: number;
  let rest!: number;
  let low_share!: number;
  let high_share!: number;
  let simplest!: number | null;
  let has_simplest!: boolean;
  let fallback!: number;
  u0 = 0n;
  u1 = 1n;
  u16 = 16n;
  one = 1;
  log_uniform = floatEntropyCoin(coins, u0);
  if (log_uniform) {
    sign_coins = (coins >> u1);
    sampled = floatSignedSample(u16, min_value, max_value, smallest_nonzero, sign_coins, first, second);
    present = (sampled !== null);
    if (present) {
      value = sampled!;
      valid = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, value);
      if (valid) {
        return value;
      }
    }
  }
  largest = f64Max();
  lowest = f64Neg(largest);
  low = min_value;
  under = (low < lowest);
  if (under) {
    low = lowest;
  }
  high = max_value;
  over = (high > largest);
  if (over) {
    high = largest;
  }
  unit = floatEntropyUnit(third);
  rest = (one - unit);
  low_share = (low * rest);
  high_share = (high * unit);
  value = (low_share + high_share);
  valid = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, value);
  if (valid) {
    return value;
  }
  simplest = floatSimplest(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero);
  has_simplest = (simplest !== null);
  if (has_simplest) {
    fallback = simplest!;
    return fallback;
  }
  return value;
}

export function textBiasedRankSpan(): bigint {
  let span!: bigint;
  span = 128n;
  return span;
}

export function textBiasThreshold(): bigint {
  let threshold!: bigint;
  threshold = 900n;
  return threshold;
}

export function textRankSpan(alphabet: Uint8Array, biased: boolean): bigint {
  let size!: bigint;
  let span!: bigint;
  let biased_span!: bigint;
  let narrower!: boolean;
  size = alphabetSize(alphabet);
  span = size;
  if (biased) {
    biased_span = textBiasedRankSpan();
    narrower = (biased_span < size);
    if (narrower) {
      span = biased_span;
    }
  }
  return span;
}

export function generationRequestKind(attempts: bigint, pending_mutations: bigint, mutation_streak: bigint): bigint {
  let u0!: bigint;
  let simplest!: bigint;
  let mutation!: bigint;
  let random!: bigint;
  let first!: boolean;
  let has_mutation!: boolean;
  let brood!: bigint;
  let fresh_due!: boolean;
  u0 = 0n;
  simplest = 1n;
  mutation = 2n;
  random = 3n;
  first = (attempts === u0);
  if (first) {
    return simplest;
  }
  has_mutation = (pending_mutations > u0);
  if (has_mutation) {
    brood = mutationAttemptCount();
    fresh_due = (mutation_streak >= brood);
    if (fresh_due) {
      return random;
    }
    return mutation;
  }
  return random;
}

export function generationEnqueueMutations(request_kind: bigint, valid: bigint): boolean {
  let random!: bigint;
  let u10!: bigint;
  let is_random!: boolean;
  let corpus_ready!: boolean;
  let enqueue!: boolean;
  random = 3n;
  u10 = 10n;
  is_random = (request_kind === random);
  corpus_ready = (valid >= u10);
  enqueue = (is_random && corpus_ready);
  return enqueue;
}

export function generationShouldContinue(valid: bigint, examples: bigint): boolean {
  let continue_!: boolean;
  continue_ = (valid < examples);
  return continue_;
}

export function generationNoveltyAction(request_kind: bigint, exact_seen: boolean): bigint {
  let skip!: bigint;
  let execute!: bigint;
  let execute_and_record!: bigint;
  let mutation!: bigint;
  let is_mutation!: boolean;
  skip = 0n;
  execute = 1n;
  execute_and_record = 2n;
  mutation = 2n;
  is_mutation = (request_kind === mutation);
  if (is_mutation) {
    if (exact_seen) {
      return skip;
    }
    return execute_and_record;
  }
  return execute;
}

export function generationRareLabelPermille(): bigint {
  let permille!: bigint;
  permille = 250n;
  return permille;
}

export function generationLabelRare(observed: bigint, valid: bigint, min_permille: bigint): boolean {
  let true_!: boolean;
  let false_!: boolean;
  let thousand!: bigint;
  let max_scaled!: bigint;
  let floor!: bigint;
  let threshold!: bigint;
  let below_floor!: boolean;
  let over_rate!: boolean;
  let short_!: boolean;
  let lhs_overflows!: boolean;
  let rhs_overflows!: boolean;
  let lhs!: bigint;
  let rhs!: bigint;
  let rare!: boolean;
  true_ = true;
  false_ = false;
  thousand = 1000n;
  max_scaled = 18446744073709551n;
  floor = generationRareLabelPermille();
  threshold = min_permille;
  below_floor = (threshold < floor);
  if (below_floor) {
    threshold = floor;
  }
  over_rate = (threshold > thousand);
  if (over_rate) {
    short_ = (observed < valid);
    return short_;
  }
  lhs_overflows = (observed > max_scaled);
  if (lhs_overflows) {
    return false_;
  }
  rhs_overflows = (valid > max_scaled);
  if (rhs_overflows) {
    return true_;
  }
  lhs = ((observed * thousand) & MASK);
  rhs = ((valid * threshold) & MASK);
  rare = (lhs < rhs);
  return rare;
}

export function generationMutationAdmission(request_kind: bigint, valid: bigint, pending: bigint, held_rare_label: boolean): bigint {
  let none!: bigint;
  let back!: bigint;
  let front!: bigint;
  let brood!: bigint;
  let full!: boolean;
  let base!: boolean;
  none = 0n;
  back = 1n;
  front = 2n;
  brood = mutationAttemptCount();
  full = (pending >= brood);
  if (full) {
    return none;
  }
  base = generationEnqueueMutations(request_kind, valid);
  if (base) {
    if (held_rare_label) {
      return front;
    }
    return back;
  }
  if (held_rare_label) {
    return front;
  }
  return none;
}

export function mutationIndex(count: bigint, entropy: bigint): bigint | null {
  let u0!: bigint;
  let u32!: bigint;
  let u4294967296!: bigint;
  let empty!: boolean;
  let too_large!: boolean;
  let invalid!: boolean;
  let none!: bigint | null;
  let slot!: bigint;
  let scaled!: bigint;
  let index!: bigint;
  let some!: bigint | null;
  u0 = 0n;
  u32 = 32n;
  u4294967296 = 4294967296n;
  empty = (count === u0);
  too_large = (count > u4294967296);
  invalid = (empty || too_large);
  if (invalid) {
    none = null;
    return none;
  }
  slot = (entropy >> u32);
  scaled = ((slot * count) & MASK);
  index = (scaled >> u32);
  some = index;
  return some;
}

export function mutationDistinctIndex(count: bigint, first: bigint, entropy: bigint): bigint | null {
  let u1!: bigint;
  let too_small!: boolean;
  let first_invalid!: boolean;
  let invalid!: boolean;
  let none!: bigint | null;
  let remaining!: bigint;
  let raw_opt!: bigint | null;
  let raw!: bigint;
  let past_hole!: boolean;
  let index!: bigint;
  let some!: bigint | null;
  u1 = 1n;
  too_small = (count <= u1);
  first_invalid = (first >= count);
  invalid = (too_small || first_invalid);
  if (invalid) {
    none = null;
    return none;
  }
  remaining = ((count - u1) & MASK);
  raw_opt = mutationIndex(remaining, entropy);
  raw = raw_opt!;
  past_hole = (raw >= first);
  index = raw;
  if (past_hole) {
    index = ((raw + u1) & MASK);
  }
  some = index;
  return some;
}

export function mutationUseFirst(entropy: bigint): boolean {
  let u0!: bigint;
  let u1!: bigint;
  let low!: bigint;
  let first!: boolean;
  u0 = 0n;
  u1 = 1n;
  low = (entropy & u1);
  first = (low === u0);
  return first;
}

export function mutationAttemptCount(): bigint {
  let u6!: bigint;
  u6 = 6n;
  return u6;
}

export function mutationAttemptRandomized(attempt: bigint): boolean {
  let u2!: bigint;
  let randomized!: boolean;
  u2 = 2n;
  randomized = (attempt >= u2);
  return randomized;
}

export function statefulFeatureGenerationRaw(): bigint {
  let u0!: bigint;
  u0 = 0n;
  return u0;
}

export function statefulFeatureProbability(raw: bigint): number {
  let u254!: bigint;
  let f255!: number;
  let bounded!: bigint;
  let too_large!: boolean;
  let value!: number;
  let probability!: number;
  u254 = 254n;
  f255 = 255;
  bounded = raw;
  too_large = (bounded > u254);
  if (too_large) {
    bounded = u254;
  }
  value = Number(bounded);
  probability = (value / f255);
  return probability;
}

export function statefulFeatureForced(candidate_count: bigint, is_candidate: boolean, decided: boolean, disabled: boolean): boolean | null {
  let u1!: bigint;
  let false_!: boolean;
  let last!: boolean;
  let must_enable!: boolean;
  let forced!: boolean | null;
  let free!: boolean | null;
  u1 = 1n;
  false_ = false;
  last = (candidate_count === u1);
  must_enable = (last && is_candidate);
  if (must_enable) {
    forced = false_;
    return forced;
  }
  if (decided) {
    forced = disabled;
    return forced;
  }
  free = null;
  return free;
}

export function statefulRuleProbeCount(): bigint {
  let u3!: bigint;
  u3 = 3n;
  return u3;
}

export function statefulFallbackMaxGood(rule_count: bigint, known_bad_count: bigint): bigint {
  let u0!: bigint;
  let valid!: boolean;
  let remaining!: bigint;
  u0 = 0n;
  valid = (known_bad_count < rule_count);
  if (valid) {
    remaining = ((rule_count - known_bad_count) & MASK);
    return remaining;
  }
  return u0;
}

export function statefulFallbackAccept(allowed_count: bigint, speculative: bigint): boolean {
  let accept!: boolean;
  accept = (allowed_count > speculative);
  return accept;
}

export function statefulChoiceProtocol(data: Uint8Array, start: bigint, remaining: bigint): bigint {
  let i0!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let first!: bigint;
  let third!: bigint;
  let seen!: bigint;
  let pos!: bigint;
  let left!: bigint;
  let enough!: boolean;
  let exhausted!: boolean;
  let end_!: bigint;
  let bad_entry!: boolean;
  let key!: bigint | null;
  let named!: boolean;
  let positional!: boolean;
  let is_first!: boolean;
  let is_third!: boolean;
  let first_choice!: boolean | null;
  let first_boolean!: boolean;
  let first_value!: boolean;
  let tag!: bigint;
  let integer!: boolean;
  i0 = 0n;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  first = i0;
  third = i0;
  seen = u0;
  pos = start;
  left = remaining;
  for (;;) {
    enough = (seen >= u3);
    if (enough) {
      break;
    }
    exhausted = (left === u0);
    if (exhausted) {
      return u1;
    }
    end_ = choiceEntryEnd(data, pos, u0);
    bad_entry = (end_ === i0);
    if (bad_entry) {
      return u1;
    }
    key = keyedEntryKey(data, pos);
    named = (key !== null);
    positional = (!named);
    if (positional) {
      is_first = (seen === u0);
      if (is_first) {
        first = pos;
      }
      is_third = (seen === u2);
      if (is_third) {
        third = pos;
      }
      seen = ((seen + u1) & MASK);
    }
    pos = end_;
    left = ((left - u1) & MASK);
  }
  first_choice = deserializeBooleanChoice(data, first);
  first_boolean = (first_choice !== null);
  if (first_boolean) {
    first_value = first_choice!;
    if (first_value) {
      return u3;
    }
  }
  tag = bget(data, third);
  integer = (tag === u0);
  if (integer) {
    return u2;
  }
  return u1;
}

export function statefulStopForced(steps_drawn: bigint, steps_rejected: bigint, step_count: bigint): boolean | null {
  let u0!: bigint;
  let u10!: bigint;
  let u1000!: bigint;
  let u_max!: bigint;
  let mul_ceiling!: bigint;
  let true_!: boolean;
  let false_!: boolean;
  let successful!: bigint;
  let progressed!: boolean;
  let done!: boolean;
  let halt!: boolean | null;
  let attempts!: bigint;
  let fits!: boolean;
  let stalled!: boolean;
  let below_floor!: boolean;
  let spent!: boolean;
  let first!: boolean;
  let go_!: boolean | null;
  let free!: boolean | null;
  u0 = 0n;
  u10 = 10n;
  u1000 = 1000n;
  u_max = 18446744073709551615n;
  mul_ceiling = 1844674407370955161n;
  true_ = true;
  false_ = false;
  successful = u0;
  progressed = (steps_drawn > steps_rejected);
  if (progressed) {
    successful = ((steps_drawn - steps_rejected) & MASK);
  }
  done = (successful >= step_count);
  if (done) {
    halt = true_;
    return halt;
  }
  attempts = u_max;
  fits = (step_count <= mul_ceiling);
  if (fits) {
    attempts = ((step_count * u10) & MASK);
  }
  stalled = (successful === u0);
  if (stalled) {
    below_floor = (attempts < u1000);
    if (below_floor) {
      attempts = u1000;
    }
  }
  spent = (steps_drawn >= attempts);
  if (spent) {
    halt = true_;
    return halt;
  }
  first = (steps_drawn === u0);
  if (first) {
    go_ = false_;
    return go_;
  }
  free = null;
  return free;
}

export function statefulContinueForced(steps_drawn: bigint, steps_rejected: bigint, step_count: bigint): boolean | null {
  let stop!: boolean | null;
  let decided!: boolean;
  let halt!: boolean;
  let go_!: boolean;
  let forced!: boolean | null;
  let free!: boolean | null;
  stop = statefulStopForced(steps_drawn, steps_rejected, step_count);
  decided = (stop !== null);
  if (decided) {
    halt = stop!;
    go_ = (!halt);
    forced = go_;
    return forced;
  }
  free = null;
  return free;
}

export function statefulContinueProbability(): number {
  let f1!: number;
  let f2_32!: number;
  let stop!: number;
  let probability!: number;
  f1 = 1;
  f2_32 = 4294967296;
  stop = (f1 / f2_32);
  probability = (f1 - stop);
  return probability;
}

export function statefulPoolPosition(active_count: bigint, newest_offset: bigint): bigint | null {
  let u1!: bigint;
  let valid!: boolean;
  let invalid!: boolean;
  let none!: bigint | null;
  let last!: bigint;
  let position!: bigint;
  let some!: bigint | null;
  u1 = 1n;
  valid = (newest_offset < active_count);
  invalid = (!valid);
  if (invalid) {
    none = null;
    return none;
  }
  last = ((active_count - u1) & MASK);
  position = ((last - newest_offset) & MASK);
  some = position;
  return some;
}

export function statefulFreshIdWindow(max_plus_one: bigint): bigint {
  let u1!: bigint;
  let window!: bigint;
  u1 = 1n;
  window = ((max_plus_one + u1) & MASK);
  return window;
}

export function statefulSetChoiceWindow(max_plus_one: bigint): bigint {
  let window!: bigint;
  window = max_plus_one;
  return window;
}

export function statefulFreshIdFallbackStep(candidate: bigint, used_id: bigint): bigint {
  let u1!: bigint;
  let next_!: bigint;
  let taken!: boolean;
  u1 = 1n;
  next_ = candidate;
  taken = (used_id === candidate);
  if (taken) {
    next_ = ((candidate + u1) & MASK);
  }
  return next_;
}

export function statefulFreshIdAccepts(value: bigint, window_hi: bigint, in_use: boolean): boolean {
  let in_window!: boolean;
  let unused!: boolean;
  let accepts!: boolean;
  in_window = (value <= window_hi);
  unused = (!in_use);
  accepts = (in_window && unused);
  return accepts;
}

export function statefulSetChoiceAccepts(value: bigint, window_hi: bigint): boolean {
  let accepts!: boolean;
  accepts = (value <= window_hi);
  return accepts;
}

export function statefulSetChoiceBetter(candidate: bigint, raw: bigint, best: bigint): boolean {
  let at_or_below!: boolean;
  let above_best!: boolean;
  let better!: boolean;
  at_or_below = (candidate <= raw);
  above_best = (candidate > best);
  better = (at_or_below && above_best);
  return better;
}

export function outcomeIsFailure(outcome: bigint): boolean {
  let interesting!: bigint;
  let is_failure!: boolean;
  interesting = 4n;
  is_failure = (outcome === interesting);
  return is_failure;
}

export function shrinkAccept(outcome: bigint, origin_matches: boolean): boolean {
  let is_failure!: boolean;
  let accept!: boolean;
  is_failure = outcomeIsFailure(outcome);
  accept = (is_failure && origin_matches);
  return accept;
}

export function shrinkCostProgress(candidate_cost: bigint, current_cost: bigint, stream_simpler: boolean): boolean {
  let false_!: boolean;
  let true_!: boolean;
  let cheaper!: boolean;
  let dearer!: boolean;
  false_ = false;
  true_ = true;
  cheaper = (candidate_cost < current_cost);
  if (cheaper) {
    return true_;
  }
  dearer = (candidate_cost > current_cost);
  if (dearer) {
    return false_;
  }
  return stream_simpler;
}

export function generationRejectionLimit(base: bigint, valid: bigint): bigint {
  let u100!: bigint;
  let max!: bigint;
  let max_valid!: bigint;
  let scale_overflows!: boolean;
  let earned!: bigint;
  let remaining!: bigint;
  let add_overflows!: boolean;
  let limit!: bigint;
  u100 = 100n;
  max = 18446744073709551615n;
  max_valid = 184467440737095516n;
  scale_overflows = (valid > max_valid);
  if (scale_overflows) {
    return max;
  }
  earned = ((valid * u100) & MASK);
  remaining = ((max - earned) & MASK);
  add_overflows = (base > remaining);
  if (add_overflows) {
    return max;
  }
  limit = ((base + earned) & MASK);
  return limit;
}

export function healthFilterTooMuch(rejections: bigint, valid: bigint, suppressed: boolean): boolean {
  let u10!: bigint;
  let u50!: bigint;
  let many_rejections!: boolean;
  let few_valid!: boolean;
  let active!: boolean;
  let unhealthy!: boolean;
  let report!: boolean;
  u10 = 10n;
  u50 = 50n;
  many_rejections = (rejections >= u50);
  few_valid = (valid < u10);
  active = (!suppressed);
  unhealthy = (many_rejections && few_valid);
  report = (unhealthy && active);
  return report;
}

export function choiceBudgetExhausted(draw_count: bigint): boolean {
  let buffer_size!: bigint;
  let exhausted!: boolean;
  buffer_size = 8192n;
  exhausted = (draw_count >= buffer_size);
  return exhausted;
}

export function healthDataTooLarge(overruns: bigint, valid: bigint, suppressed: boolean): boolean {
  let u10!: bigint;
  let u20!: bigint;
  let many_overruns!: boolean;
  let few_valid!: boolean;
  let active!: boolean;
  let unhealthy!: boolean;
  let report!: boolean;
  u10 = 10n;
  u20 = 20n;
  many_overruns = (overruns >= u20);
  few_valid = (valid < u10);
  active = (!suppressed);
  unhealthy = (many_overruns && few_valid);
  report = (unhealthy && active);
  return report;
}

export function healthLargeBaseExample(overran: boolean, outcome: bigint, draw_count: bigint, suppressed: boolean): boolean {
  let u0!: bigint;
  let half_buffer!: bigint;
  let valid!: boolean;
  let large!: boolean;
  let large_valid!: boolean;
  let unhealthy!: boolean;
  let active!: boolean;
  let report!: boolean;
  u0 = 0n;
  half_buffer = 4096n;
  valid = (outcome === u0);
  large = (draw_count > half_buffer);
  large_valid = (valid && large);
  unhealthy = (overran || large_valid);
  active = (!suppressed);
  report = (unhealthy && active);
  return report;
}

export function healthTooSlow(generation_us: bigint, valid: bigint, suppressed: boolean): boolean {
  let u10!: bigint;
  let one_second_us!: bigint;
  let slow!: boolean;
  let few_valid!: boolean;
  let active!: boolean;
  let unhealthy!: boolean;
  let report!: boolean;
  u10 = 10n;
  one_second_us = 1000000n;
  slow = (generation_us > one_second_us);
  few_valid = (valid < u10);
  active = (!suppressed);
  unhealthy = (slow && few_valid);
  report = (unhealthy && active);
  return report;
}

export function coverageFailed(observed: bigint, valid: bigint, min_permille: bigint): boolean {
  let true_!: boolean;
  let false_!: boolean;
  let zero!: bigint;
  let thousand!: bigint;
  let max_scaled!: bigint;
  let never!: boolean;
  let no_rate!: boolean;
  let lhs_overflows!: boolean;
  let over_rate!: boolean;
  let failed_clamped!: boolean;
  let rhs_overflows!: boolean;
  let lhs!: bigint;
  let rhs!: bigint;
  let failed!: boolean;
  true_ = true;
  false_ = false;
  zero = 0n;
  thousand = 1000n;
  max_scaled = 18446744073709551n;
  never = (observed === zero);
  if (never) {
    return true_;
  }
  no_rate = (min_permille === zero);
  if (no_rate) {
    return false_;
  }
  lhs_overflows = (observed > max_scaled);
  if (lhs_overflows) {
    return false_;
  }
  over_rate = (min_permille > thousand);
  if (over_rate) {
    failed_clamped = (observed < valid);
    return failed_clamped;
  }
  rhs_overflows = (valid > max_scaled);
  if (rhs_overflows) {
    return true_;
  }
  lhs = ((observed * thousand) & MASK);
  rhs = ((min_permille * valid) & MASK);
  failed = (lhs < rhs);
  return failed;
}

export function shrinkCandidateAt(current: bigint, ordinal: bigint): bigint | null {
  let u0!: bigint;
  let u1!: bigint;
  let u4!: bigint;
  let u5!: bigint;
  let empty!: boolean;
  let none_empty!: bigint | null;
  let within_current!: boolean;
  let within_prefix!: boolean;
  let linear!: boolean;
  let some_linear!: bigint | null;
  let prefix_exhausts!: boolean;
  let none_prefix!: bigint | null;
  let seen!: bigint;
  let lower!: bigint;
  let gap!: bigint;
  let exhausted!: boolean;
  let half!: bigint;
  let probe!: bigint;
  let want_probe!: boolean;
  let some_probe!: bigint | null;
  let none!: bigint | null;
  u0 = 0n;
  u1 = 1n;
  u4 = 4n;
  u5 = 5n;
  empty = (current === u0);
  if (empty) {
    none_empty = null;
    return none_empty;
  }
  within_current = (ordinal < current);
  within_prefix = (ordinal < u5);
  linear = (within_current && within_prefix);
  if (linear) {
    some_linear = ordinal;
    return some_linear;
  }
  prefix_exhausts = (current <= u5);
  if (prefix_exhausts) {
    none_prefix = null;
    return none_prefix;
  }
  seen = u5;
  lower = u4;
  for (;;) {
    gap = ((current - lower) & MASK);
    exhausted = (gap <= u1);
    if (exhausted) {
      break;
    }
    half = (gap >> u1);
    probe = ((lower + half) & MASK);
    want_probe = (ordinal === seen);
    if (want_probe) {
      some_probe = probe;
      return some_probe;
    }
    seen = ((seen + u1) & MASK);
    lower = probe;
  }
  none = null;
  return none;
}

export function shrinkNextShrinks(phase: bigint, feedback: bigint, shrinks: bigint): bigint {
  let u1!: bigint;
  let phase_baseline!: bigint;
  let phase_verify!: bigint;
  let feedback_accepted!: bigint;
  let in_baseline!: boolean;
  let in_verify!: boolean;
  let accepted!: boolean;
  let bumped!: bigint;
  u1 = 1n;
  phase_baseline = 0n;
  phase_verify = 3n;
  feedback_accepted = 2n;
  in_baseline = (phase === phase_baseline);
  if (in_baseline) {
    return shrinks;
  }
  in_verify = (phase === phase_verify);
  if (in_verify) {
    return shrinks;
  }
  accepted = (feedback === feedback_accepted);
  if (accepted) {
    bumped = ((shrinks + u1) & MASK);
    return bumped;
  }
  return shrinks;
}

export function shrinkSweepAgain(improved: boolean, shrinks: bigint, max_shrinks: bigint): boolean {
  let u0!: bigint;
  let false_!: boolean;
  let true_!: boolean;
  let idle!: boolean;
  let uncapped!: boolean;
  let under!: boolean;
  u0 = 0n;
  false_ = false;
  true_ = true;
  idle = (!improved);
  if (idle) {
    return false_;
  }
  uncapped = (max_shrinks === u0);
  if (uncapped) {
    return true_;
  }
  under = (shrinks < max_shrinks);
  return under;
}

export function shrinkNextStall(stall: bigint, feedback: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let feedback_skip!: bigint;
  let feedback_accepted!: bigint;
  let accepted!: boolean;
  let skipped!: boolean;
  let bumped!: bigint;
  u0 = 0n;
  u1 = 1n;
  feedback_skip = 0n;
  feedback_accepted = 2n;
  accepted = (feedback === feedback_accepted);
  if (accepted) {
    return u0;
  }
  skipped = (feedback === feedback_skip);
  if (skipped) {
    return stall;
  }
  bumped = ((stall + u1) & MASK);
  return bumped;
}

export function shrinkNextSpanCursor(phase: bigint, feedback: bigint, span_cursor: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_delete!: bigint;
  let feedback_accepted!: bigint;
  let in_delete!: boolean;
  let accepted!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_delete = 1n;
  feedback_accepted = 2n;
  in_delete = (phase === phase_delete);
  if (in_delete) {
    accepted = (feedback === feedback_accepted);
    if (accepted) {
      return u0;
    }
    advanced = ((span_cursor + u1) & MASK);
    return advanced;
  }
  return u0;
}

export function shrinkNextPaidCursor(phase: bigint, feedback: bigint, paid_cursor: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_paid!: bigint;
  let feedback_skip!: bigint;
  let feedback_accepted!: bigint;
  let in_paid!: boolean;
  let accepted!: boolean;
  let skipped!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_paid = 12n;
  feedback_skip = 0n;
  feedback_accepted = 2n;
  in_paid = (phase === phase_paid);
  if (in_paid) {
    accepted = (feedback === feedback_accepted);
    if (accepted) {
      return u0;
    }
    skipped = (feedback === feedback_skip);
    if (skipped) {
      advanced = ((paid_cursor + u1) & MASK);
      return advanced;
    }
    return paid_cursor;
  }
  return u0;
}

export function shrinkDeletePaidVariant(ordinal: bigint, widened: boolean): bigint | null {
  let u0!: bigint;
  let u1!: bigint;
  let i0!: bigint;
  let i1!: bigint;
  let step!: bigint;
  let plain!: boolean;
  let some_plain!: bigint | null;
  let down!: boolean;
  let minus_one!: bigint;
  let some_down!: bigint | null;
  let up!: boolean;
  let some_up!: bigint | null;
  let none!: bigint | null;
  u0 = 0n;
  u1 = 1n;
  i0 = 0n;
  i1 = 1n;
  step = ordinal;
  if (widened) {
    plain = (ordinal === u0);
    if (plain) {
      some_plain = i0;
      return some_plain;
    }
    step = ((ordinal - u1) & MASK);
  }
  down = (step === u0);
  if (down) {
    minus_one = (i0 - i1);
    some_down = minus_one;
    return some_down;
  }
  up = (step === u1);
  if (up) {
    some_up = i1;
    return some_up;
  }
  none = null;
  return none;
}

export function shrinkNextRaiseCursor(phase: bigint, feedback: bigint, raise_cursor: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_raise!: bigint;
  let feedback_skip!: bigint;
  let feedback_accepted!: bigint;
  let in_raise!: boolean;
  let accepted!: boolean;
  let skipped!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_raise = 13n;
  feedback_skip = 0n;
  feedback_accepted = 2n;
  in_raise = (phase === phase_raise);
  if (in_raise) {
    accepted = (feedback === feedback_accepted);
    if (accepted) {
      return u0;
    }
    skipped = (feedback === feedback_skip);
    if (skipped) {
      advanced = ((raise_cursor + u1) & MASK);
      return advanced;
    }
    return raise_cursor;
  }
  return u0;
}

export function shrinkRaiseCandidate(current_index: bigint, max_index: bigint, ordinal: bigint): bigint | null {
  let u0!: bigint;
  let u1!: bigint;
  let below_max!: boolean;
  let at_max!: boolean;
  let none_max!: bigint | null;
  let next_!: bigint;
  let first!: boolean;
  let some_next!: bigint | null;
  let second!: boolean;
  let beyond_next!: boolean;
  let jumps!: boolean;
  let some_max!: bigint | null;
  let none!: bigint | null;
  u0 = 0n;
  u1 = 1n;
  below_max = (current_index < max_index);
  at_max = (!below_max);
  if (at_max) {
    none_max = null;
    return none_max;
  }
  next_ = ((current_index + u1) & MASK);
  first = (ordinal === u0);
  if (first) {
    some_next = next_;
    return some_next;
  }
  second = (ordinal === u1);
  beyond_next = (next_ < max_index);
  jumps = (second && beyond_next);
  if (jumps) {
    some_max = max_index;
    return some_max;
  }
  none = null;
  return none;
}

export function shrinkNextPosition(phase: bigint, feedback: bigint, position: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_lower!: bigint;
  let feedback_skip!: bigint;
  let feedback_accepted!: bigint;
  let in_lower!: boolean;
  let accepted!: boolean;
  let skipped!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_lower = 2n;
  feedback_skip = 0n;
  feedback_accepted = 2n;
  in_lower = (phase === phase_lower);
  if (in_lower) {
    accepted = (feedback === feedback_accepted);
    if (accepted) {
      return u0;
    }
    skipped = (feedback === feedback_skip);
    if (skipped) {
      advanced = ((position + u1) & MASK);
      return advanced;
    }
    return position;
  }
  return u0;
}

export function shrinkNextShortenCursor(phase: bigint, feedback: bigint, shorten_cursor: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_shorten!: bigint;
  let feedback_skip!: bigint;
  let feedback_accepted!: bigint;
  let in_shorten!: boolean;
  let accepted!: boolean;
  let skipped!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_shorten = 11n;
  feedback_skip = 0n;
  feedback_accepted = 2n;
  in_shorten = (phase === phase_shorten);
  if (in_shorten) {
    accepted = (feedback === feedback_accepted);
    if (accepted) {
      return u0;
    }
    skipped = (feedback === feedback_skip);
    if (skipped) {
      advanced = ((shorten_cursor + u1) & MASK);
      return advanced;
    }
    return shorten_cursor;
  }
  return u0;
}

export function shrinkNextCharacterCursor(phase: bigint, feedback: bigint, character_cursor: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_character!: bigint;
  let feedback_skip!: bigint;
  let feedback_accepted!: bigint;
  let in_character!: boolean;
  let accepted!: boolean;
  let skipped!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_character = 10n;
  feedback_skip = 0n;
  feedback_accepted = 2n;
  in_character = (phase === phase_character);
  if (in_character) {
    accepted = (feedback === feedback_accepted);
    if (accepted) {
      return u0;
    }
    skipped = (feedback === feedback_skip);
    if (skipped) {
      advanced = ((character_cursor + u1) & MASK);
      return advanced;
    }
    return character_cursor;
  }
  return u0;
}

export function shrinkNextDescendantCursor(phase: bigint, feedback: bigint, descendant_cursor: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_descendant!: bigint;
  let feedback_skip!: bigint;
  let feedback_accepted!: bigint;
  let in_descendant!: boolean;
  let accepted!: boolean;
  let skipped!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_descendant = 9n;
  feedback_skip = 0n;
  feedback_accepted = 2n;
  in_descendant = (phase === phase_descendant);
  if (in_descendant) {
    accepted = (feedback === feedback_accepted);
    if (accepted) {
      return u0;
    }
    skipped = (feedback === feedback_skip);
    if (skipped) {
      advanced = ((descendant_cursor + u1) & MASK);
      return advanced;
    }
    return descendant_cursor;
  }
  return u0;
}

export function shrinkDescendantWorthwhile(ancestor_choices: bigint, descendant_choices: bigint): boolean {
  let u0!: bigint;
  let nonempty!: boolean;
  let shorter!: boolean;
  let worthwhile!: boolean;
  u0 = 0n;
  nonempty = (descendant_choices > u0);
  shorter = (descendant_choices < ancestor_choices);
  worthwhile = (nonempty && shorter);
  return worthwhile;
}

export function shrinkNextTrivialCursor(phase: bigint, feedback: bigint, trivial_cursor: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_trivial!: bigint;
  let feedback_accepted!: bigint;
  let in_trivial!: boolean;
  let accepted!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_trivial = 8n;
  feedback_accepted = 2n;
  in_trivial = (phase === phase_trivial);
  if (in_trivial) {
    accepted = (feedback === feedback_accepted);
    if (accepted) {
      return u0;
    }
    advanced = ((trivial_cursor + u1) & MASK);
    return advanced;
  }
  return u0;
}

export function shrinkTrivialWorthwhile(rewritable: bigint): boolean {
  let u0!: bigint;
  let worthwhile!: boolean;
  u0 = 0n;
  worthwhile = (rewritable > u0);
  return worthwhile;
}

export function shrinkNextReorderCursor(phase: bigint, feedback: bigint, reorder_cursor: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_reorder!: bigint;
  let feedback_accepted!: bigint;
  let in_reorder!: boolean;
  let accepted!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_reorder = 7n;
  feedback_accepted = 2n;
  in_reorder = (phase === phase_reorder);
  if (in_reorder) {
    accepted = (feedback === feedback_accepted);
    if (accepted) {
      return u0;
    }
    advanced = ((reorder_cursor + u1) & MASK);
    return advanced;
  }
  return u0;
}

export function shrinkNextPairCursor(phase: bigint, feedback: bigint, pair_cursor: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_pair!: bigint;
  let feedback_skip!: bigint;
  let feedback_accepted!: bigint;
  let in_pair!: boolean;
  let accepted!: boolean;
  let skipped!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_pair = 6n;
  feedback_skip = 0n;
  feedback_accepted = 2n;
  in_pair = (phase === phase_pair);
  if (in_pair) {
    accepted = (feedback === feedback_accepted);
    if (accepted) {
      return u0;
    }
    skipped = (feedback === feedback_skip);
    if (skipped) {
      advanced = ((pair_cursor + u1) & MASK);
      return advanced;
    }
    return pair_cursor;
  }
  return u0;
}

export function shrinkPairCount(draw_count: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let empty!: boolean;
  let pairs!: bigint;
  u0 = 0n;
  u1 = 1n;
  empty = (draw_count < u1);
  if (empty) {
    return u0;
  }
  pairs = ((draw_count - u1) & MASK);
  return pairs;
}

export function shrinkNextDuplicateCursor(phase: bigint, feedback: bigint, duplicate_cursor: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_duplicate!: bigint;
  let feedback_skip!: bigint;
  let feedback_accepted!: bigint;
  let in_duplicate!: boolean;
  let accepted!: boolean;
  let skipped!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_duplicate = 5n;
  feedback_skip = 0n;
  feedback_accepted = 2n;
  in_duplicate = (phase === phase_duplicate);
  if (in_duplicate) {
    accepted = (feedback === feedback_accepted);
    if (accepted) {
      return u0;
    }
    skipped = (feedback === feedback_skip);
    if (skipped) {
      advanced = ((duplicate_cursor + u1) & MASK);
      return advanced;
    }
    return duplicate_cursor;
  }
  return u0;
}

export function shrinkNextOrdinal(phase: bigint, feedback: bigint, ordinal: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let phase_lower!: bigint;
  let phase_duplicate!: bigint;
  let phase_pair!: bigint;
  let phase_descendant!: bigint;
  let phase_character!: bigint;
  let phase_shorten!: bigint;
  let phase_paid!: bigint;
  let phase_raise!: bigint;
  let feedback_rejected!: bigint;
  let is_lower!: boolean;
  let is_duplicate!: boolean;
  let is_pair!: boolean;
  let is_descendant!: boolean;
  let is_character!: boolean;
  let is_shorten!: boolean;
  let is_paid!: boolean;
  let is_raise!: boolean;
  let walks_schedule!: boolean;
  let walks_ordinal!: boolean;
  let walks_span!: boolean;
  let walks_string!: boolean;
  let walks_shorten!: boolean;
  let walks_paid!: boolean;
  let in_lower!: boolean;
  let rejected!: boolean;
  let advanced!: bigint;
  u0 = 0n;
  u1 = 1n;
  phase_lower = 2n;
  phase_duplicate = 5n;
  phase_pair = 6n;
  phase_descendant = 9n;
  phase_character = 10n;
  phase_shorten = 11n;
  phase_paid = 12n;
  phase_raise = 13n;
  feedback_rejected = 1n;
  is_lower = (phase === phase_lower);
  is_duplicate = (phase === phase_duplicate);
  is_pair = (phase === phase_pair);
  is_descendant = (phase === phase_descendant);
  is_character = (phase === phase_character);
  is_shorten = (phase === phase_shorten);
  is_paid = (phase === phase_paid);
  is_raise = (phase === phase_raise);
  walks_schedule = (is_lower || is_duplicate);
  walks_ordinal = (walks_schedule || is_pair);
  walks_span = (walks_ordinal || is_descendant);
  walks_string = (walks_span || is_character);
  walks_shorten = (walks_string || is_shorten);
  walks_paid = (walks_shorten || is_paid);
  in_lower = (walks_paid || is_raise);
  if (in_lower) {
    rejected = (feedback === feedback_rejected);
    if (rejected) {
      advanced = ((ordinal + u1) & MASK);
      return advanced;
    }
    return u0;
  }
  return u0;
}

export function shrinkNextPhase(phase: bigint, feedback: bigint, span_cursor: bigint, duplicate_cursor: bigint, position: bigint, pair_cursor: bigint, reorder_cursor: bigint, trivial_cursor: bigint, descendant_cursor: bigint, character_cursor: bigint, shorten_cursor: bigint, paid_cursor: bigint, raise_cursor: bigint, shrinks: bigint, stall: bigint, max_shrinks: bigint, max_stall: bigint, draw_count: bigint, span_count: bigint): bigint {
  let u0!: bigint;
  let phase_baseline!: bigint;
  let phase_delete!: bigint;
  let phase_lower!: bigint;
  let phase_verify!: bigint;
  let phase_done!: bigint;
  let phase_duplicate!: bigint;
  let phase_pair!: bigint;
  let phase_reorder!: bigint;
  let phase_trivial!: bigint;
  let phase_descendant!: bigint;
  let phase_character!: bigint;
  let phase_shorten!: bigint;
  let phase_paid!: bigint;
  let phase_raise!: bigint;
  let feedback_accepted!: bigint;
  let accepted!: boolean;
  let next_!: bigint;
  let in_baseline!: boolean;
  let in_delete!: boolean;
  let in_paid!: boolean;
  let in_raise!: boolean;
  let in_descendant!: boolean;
  let in_verify!: boolean;
  let settled!: boolean;
  let shrinks_next!: bigint;
  let stall_next!: bigint;
  let shrinks_capped!: boolean;
  let over_shrinks!: boolean;
  let stop_shrinks!: boolean;
  let stall_capped!: boolean;
  let over_stall!: boolean;
  let stop_stall!: boolean;
  let lands_delete!: boolean;
  let span_next!: bigint;
  let spans_left!: boolean;
  let spans_done!: boolean;
  let lands_paid!: boolean;
  let paid_next!: bigint;
  let paid_left!: boolean;
  let paid_done!: boolean;
  let lands_trivial!: boolean;
  let trivial_next!: bigint;
  let trivial_left!: boolean;
  let trivial_done!: boolean;
  let lands_descendant!: boolean;
  let descendant_next!: bigint;
  let descendants_left!: boolean;
  let descendants_done!: boolean;
  let lands_reorder!: boolean;
  let reorder_next!: bigint;
  let siblings_left!: boolean;
  let siblings_done!: boolean;
  let lands_duplicate!: boolean;
  let duplicate_next!: bigint;
  let duplicate_left!: boolean;
  let duplicate_done!: boolean;
  let lands_lower!: boolean;
  let position_next!: bigint;
  let draws_left!: boolean;
  let draws_done!: boolean;
  let lands_pair!: boolean;
  let pair_next!: bigint;
  let pair_count!: bigint;
  let pairs_left!: boolean;
  let pairs_done!: boolean;
  let lands_shorten!: boolean;
  let shorten_next!: bigint;
  let shorten_left!: boolean;
  let shorten_done!: boolean;
  let lands_character!: boolean;
  let character_next!: bigint;
  let characters_left!: boolean;
  let characters_done!: boolean;
  let lands_raise!: boolean;
  let raise_next!: bigint;
  let raisable!: bigint;
  let raises_left!: boolean;
  let raises_done!: boolean;
  u0 = 0n;
  phase_baseline = 0n;
  phase_delete = 1n;
  phase_lower = 2n;
  phase_verify = 3n;
  phase_done = 4n;
  phase_duplicate = 5n;
  phase_pair = 6n;
  phase_reorder = 7n;
  phase_trivial = 8n;
  phase_descendant = 9n;
  phase_character = 10n;
  phase_shorten = 11n;
  phase_paid = 12n;
  phase_raise = 13n;
  feedback_accepted = 2n;
  accepted = (feedback === feedback_accepted);
  next_ = phase;
  in_baseline = (phase === phase_baseline);
  if (in_baseline) {
    next_ = phase_lower;
    if (accepted) {
      next_ = phase_delete;
    }
  }
  in_delete = (phase === phase_delete);
  if (in_delete) {
    if (accepted) {
      next_ = phase_baseline;
    }
  }
  in_paid = (phase === phase_paid);
  if (in_paid) {
    if (accepted) {
      next_ = phase_baseline;
    }
  }
  in_raise = (phase === phase_raise);
  if (in_raise) {
    if (accepted) {
      next_ = phase_baseline;
    }
  }
  in_descendant = (phase === phase_descendant);
  if (in_descendant) {
    if (accepted) {
      next_ = phase_baseline;
    }
  }
  in_verify = (phase === phase_verify);
  if (in_verify) {
    next_ = phase_done;
  }
  settled = (next_ !== phase_done);
  if (settled) {
    shrinks_next = shrinkNextShrinks(phase, feedback, shrinks);
    stall_next = shrinkNextStall(stall, feedback);
    shrinks_capped = (max_shrinks !== u0);
    over_shrinks = (shrinks_next >= max_shrinks);
    stop_shrinks = (shrinks_capped && over_shrinks);
    if (stop_shrinks) {
      next_ = phase_verify;
    }
    stall_capped = (max_stall !== u0);
    over_stall = (stall_next >= max_stall);
    stop_stall = (stall_capped && over_stall);
    if (stop_stall) {
      next_ = phase_verify;
    }
  }
  lands_delete = (next_ === phase_delete);
  if (lands_delete) {
    span_next = shrinkNextSpanCursor(phase, feedback, span_cursor);
    spans_left = (span_next < span_count);
    spans_done = (!spans_left);
    if (spans_done) {
      next_ = phase_paid;
    }
  }
  lands_paid = (next_ === phase_paid);
  if (lands_paid) {
    paid_next = shrinkNextPaidCursor(phase, feedback, paid_cursor);
    paid_left = (paid_next < span_count);
    paid_done = (!paid_left);
    if (paid_done) {
      next_ = phase_trivial;
    }
  }
  lands_trivial = (next_ === phase_trivial);
  if (lands_trivial) {
    trivial_next = shrinkNextTrivialCursor(phase, feedback, trivial_cursor);
    trivial_left = (trivial_next < span_count);
    trivial_done = (!trivial_left);
    if (trivial_done) {
      next_ = phase_descendant;
    }
  }
  lands_descendant = (next_ === phase_descendant);
  if (lands_descendant) {
    descendant_next = shrinkNextDescendantCursor(phase, feedback, descendant_cursor);
    descendants_left = (descendant_next < span_count);
    descendants_done = (!descendants_left);
    if (descendants_done) {
      next_ = phase_reorder;
    }
  }
  lands_reorder = (next_ === phase_reorder);
  if (lands_reorder) {
    reorder_next = shrinkNextReorderCursor(phase, feedback, reorder_cursor);
    siblings_left = (reorder_next < span_count);
    siblings_done = (!siblings_left);
    if (siblings_done) {
      next_ = phase_duplicate;
    }
  }
  lands_duplicate = (next_ === phase_duplicate);
  if (lands_duplicate) {
    duplicate_next = shrinkNextDuplicateCursor(phase, feedback, duplicate_cursor);
    duplicate_left = (duplicate_next < draw_count);
    duplicate_done = (!duplicate_left);
    if (duplicate_done) {
      next_ = phase_lower;
    }
  }
  lands_lower = (next_ === phase_lower);
  if (lands_lower) {
    position_next = shrinkNextPosition(phase, feedback, position);
    draws_left = (position_next < draw_count);
    draws_done = (!draws_left);
    if (draws_done) {
      next_ = phase_pair;
    }
  }
  lands_pair = (next_ === phase_pair);
  if (lands_pair) {
    pair_next = shrinkNextPairCursor(phase, feedback, pair_cursor);
    pair_count = shrinkPairCount(draw_count);
    pairs_left = (pair_next < pair_count);
    pairs_done = (!pairs_left);
    if (pairs_done) {
      next_ = phase_shorten;
    }
  }
  lands_shorten = (next_ === phase_shorten);
  if (lands_shorten) {
    shorten_next = shrinkNextShortenCursor(phase, feedback, shorten_cursor);
    shorten_left = (shorten_next < draw_count);
    shorten_done = (!shorten_left);
    if (shorten_done) {
      next_ = phase_character;
    }
  }
  lands_character = (next_ === phase_character);
  if (lands_character) {
    character_next = shrinkNextCharacterCursor(phase, feedback, character_cursor);
    characters_left = (character_next < draw_count);
    characters_done = (!characters_left);
    if (characters_done) {
      next_ = phase_raise;
    }
  }
  lands_raise = (next_ === phase_raise);
  if (lands_raise) {
    raise_next = shrinkNextRaiseCursor(phase, feedback, raise_cursor);
    raisable = shrinkPairCount(draw_count);
    raises_left = (raise_next < raisable);
    raises_done = (!raises_left);
    if (raises_done) {
      next_ = phase_verify;
    }
  }
  return next_;
}

export function shrinkRequestKind(phase: bigint, span_cursor: bigint, duplicate_cursor: bigint, position: bigint, pair_cursor: bigint, reorder_cursor: bigint, trivial_cursor: bigint, descendant_cursor: bigint, character_cursor: bigint, shorten_cursor: bigint, paid_cursor: bigint, raise_cursor: bigint, draw_count: bigint, span_count: bigint): bigint {
  let phase_baseline!: bigint;
  let phase_delete!: bigint;
  let phase_lower!: bigint;
  let phase_verify!: bigint;
  let phase_duplicate!: bigint;
  let phase_pair!: bigint;
  let phase_reorder!: bigint;
  let phase_trivial!: bigint;
  let phase_descendant!: bigint;
  let phase_character!: bigint;
  let phase_shorten!: bigint;
  let phase_paid!: bigint;
  let phase_raise!: bigint;
  let request_done!: bigint;
  let request_baseline!: bigint;
  let request_delete!: bigint;
  let request_lower!: bigint;
  let request_verify!: bigint;
  let request_duplicates!: bigint;
  let request_pair!: bigint;
  let request_reorder!: bigint;
  let request_trivial!: bigint;
  let request_descendant!: bigint;
  let request_character!: bigint;
  let request_shorten!: bigint;
  let request_paid!: bigint;
  let request_raise!: bigint;
  let is_baseline!: boolean;
  let is_delete!: boolean;
  let spans_left!: boolean;
  let is_paid!: boolean;
  let paid_left!: boolean;
  let is_trivial!: boolean;
  let trivial_left!: boolean;
  let is_descendant!: boolean;
  let descendants_left!: boolean;
  let is_reorder!: boolean;
  let siblings_left!: boolean;
  let is_duplicate!: boolean;
  let groups_left!: boolean;
  let is_lower!: boolean;
  let draws_left!: boolean;
  let is_pair!: boolean;
  let pair_count!: bigint;
  let pairs_left!: boolean;
  let is_shorten!: boolean;
  let shorten_left!: boolean;
  let is_character!: boolean;
  let characters_left!: boolean;
  let is_raise!: boolean;
  let raisable!: bigint;
  let raises_left!: boolean;
  let is_verify!: boolean;
  phase_baseline = 0n;
  phase_delete = 1n;
  phase_lower = 2n;
  phase_verify = 3n;
  phase_duplicate = 5n;
  phase_pair = 6n;
  phase_reorder = 7n;
  phase_trivial = 8n;
  phase_descendant = 9n;
  phase_character = 10n;
  phase_shorten = 11n;
  phase_paid = 12n;
  phase_raise = 13n;
  request_done = 0n;
  request_baseline = 1n;
  request_delete = 2n;
  request_lower = 3n;
  request_verify = 4n;
  request_duplicates = 5n;
  request_pair = 6n;
  request_reorder = 7n;
  request_trivial = 8n;
  request_descendant = 9n;
  request_character = 10n;
  request_shorten = 11n;
  request_paid = 12n;
  request_raise = 13n;
  is_baseline = (phase === phase_baseline);
  if (is_baseline) {
    return request_baseline;
  }
  is_delete = (phase === phase_delete);
  if (is_delete) {
    spans_left = (span_cursor < span_count);
    if (spans_left) {
      return request_delete;
    }
    return request_done;
  }
  is_paid = (phase === phase_paid);
  if (is_paid) {
    paid_left = (paid_cursor < span_count);
    if (paid_left) {
      return request_paid;
    }
    return request_done;
  }
  is_trivial = (phase === phase_trivial);
  if (is_trivial) {
    trivial_left = (trivial_cursor < span_count);
    if (trivial_left) {
      return request_trivial;
    }
    return request_done;
  }
  is_descendant = (phase === phase_descendant);
  if (is_descendant) {
    descendants_left = (descendant_cursor < span_count);
    if (descendants_left) {
      return request_descendant;
    }
    return request_done;
  }
  is_reorder = (phase === phase_reorder);
  if (is_reorder) {
    siblings_left = (reorder_cursor < span_count);
    if (siblings_left) {
      return request_reorder;
    }
    return request_done;
  }
  is_duplicate = (phase === phase_duplicate);
  if (is_duplicate) {
    groups_left = (duplicate_cursor < draw_count);
    if (groups_left) {
      return request_duplicates;
    }
    return request_done;
  }
  is_lower = (phase === phase_lower);
  if (is_lower) {
    draws_left = (position < draw_count);
    if (draws_left) {
      return request_lower;
    }
    return request_done;
  }
  is_pair = (phase === phase_pair);
  if (is_pair) {
    pair_count = shrinkPairCount(draw_count);
    pairs_left = (pair_cursor < pair_count);
    if (pairs_left) {
      return request_pair;
    }
    return request_done;
  }
  is_shorten = (phase === phase_shorten);
  if (is_shorten) {
    shorten_left = (shorten_cursor < draw_count);
    if (shorten_left) {
      return request_shorten;
    }
    return request_done;
  }
  is_character = (phase === phase_character);
  if (is_character) {
    characters_left = (character_cursor < draw_count);
    if (characters_left) {
      return request_character;
    }
    return request_done;
  }
  is_raise = (phase === phase_raise);
  if (is_raise) {
    raisable = shrinkPairCount(draw_count);
    raises_left = (raise_cursor < raisable);
    if (raises_left) {
      return request_raise;
    }
    return request_done;
  }
  is_verify = (phase === phase_verify);
  if (is_verify) {
    return request_verify;
  }
  return request_done;
}

export function shrinkRequestSpan(span_cursor: bigint, span_count: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let spans_left!: boolean;
  let exhausted!: boolean;
  let last!: bigint;
  let index!: bigint;
  u0 = 0n;
  u1 = 1n;
  spans_left = (span_cursor < span_count);
  exhausted = (!spans_left);
  if (exhausted) {
    return u0;
  }
  last = ((span_count - u1) & MASK);
  index = ((last - span_cursor) & MASK);
  return index;
}

export function shrinkDuplicateWorthwhile(members: bigint, current_index: bigint): boolean {
  let u0!: bigint;
  let u2!: bigint;
  let shared!: boolean;
  let lowerable!: boolean;
  let worthwhile!: boolean;
  u0 = 0n;
  u2 = 2n;
  shared = (members >= u2);
  lowerable = (current_index !== u0);
  worthwhile = (shared && lowerable);
  return worthwhile;
}

export function shrinkPairBase(left_index: bigint, right_index: bigint): bigint {
  let right_smaller!: boolean;
  right_smaller = (right_index < left_index);
  if (right_smaller) {
    return right_index;
  }
  return left_index;
}

export function shrinkPairWorthwhile(left_index: bigint, right_index: bigint): boolean {
  let u0!: bigint;
  let base!: bigint;
  let worthwhile!: boolean;
  u0 = 0n;
  base = shrinkPairBase(left_index, right_index);
  worthwhile = (base !== u0);
  return worthwhile;
}

export function shrinkPairCandidate(index: bigint, base: bigint, candidate: bigint): bigint | null {
  let rising!: boolean;
  let none_rising!: bigint | null;
  let shift!: bigint;
  let too_small!: boolean;
  let none_small!: bigint | null;
  let shifted!: bigint;
  let some_shifted!: bigint | null;
  rising = (candidate > base);
  if (rising) {
    none_rising = null;
    return none_rising;
  }
  shift = ((base - candidate) & MASK);
  too_small = (index < shift);
  if (too_small) {
    none_small = null;
    return none_small;
  }
  shifted = ((index - shift) & MASK);
  some_shifted = shifted;
  return some_shifted;
}

export function shrinkCandidateCount(current: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let ordinal!: bigint;
  let candidate!: bigint | null;
  let present!: boolean;
  let done!: boolean;
  u0 = 0n;
  u1 = 1n;
  ordinal = u0;
  for (;;) {
    candidate = shrinkCandidateAt(current, ordinal);
    present = (candidate !== null);
    done = (!present);
    if (done) {
      break;
    }
    ordinal = ((ordinal + u1) & MASK);
  }
  return ordinal;
}

export function lengthPContinue(min_size: bigint, max_size: bigint, has_max: boolean): number {
  let f0_5!: number;
  let f1!: number;
  let f2!: number;
  let f5!: number;
  let f0_99!: number;
  let minimum!: bigint;
  let min_f!: number;
  let infinity!: number;
  let max_f!: number;
  let bounded!: bigint;
  let doubled!: number;
  let plus_five!: number;
  let floor!: number;
  let five_larger!: boolean;
  let span!: number;
  let midpoint!: number;
  let average!: number;
  let midpoint_smaller!: boolean;
  let desired_extra!: number;
  let max_extra!: number;
  let saturated!: boolean;
  let unbounded!: boolean;
  let denominator!: number;
  let ratio!: number;
  let p!: number;
  f0_5 = 0.5;
  f1 = 1;
  f2 = 2;
  f5 = 5;
  f0_99 = 0.99;
  minimum = (min_size & MASK);
  min_f = Number(minimum);
  infinity = f64Infinity();
  max_f = infinity;
  if (has_max) {
    bounded = (max_size & MASK);
    max_f = Number(bounded);
  }
  doubled = (min_f * f2);
  plus_five = (min_f + f5);
  floor = doubled;
  five_larger = (plus_five > doubled);
  if (five_larger) {
    floor = plus_five;
  }
  span = (min_f + max_f);
  midpoint = (span * f0_5);
  average = floor;
  midpoint_smaller = (midpoint < floor);
  if (midpoint_smaller) {
    average = midpoint;
  }
  desired_extra = (average - min_f);
  max_extra = (max_f - min_f);
  saturated = (desired_extra >= max_extra);
  if (saturated) {
    return f0_99;
  }
  unbounded = isInf(max_f);
  if (unbounded) {
    denominator = (f1 + desired_extra);
    ratio = (f1 / denominator);
    p = (f1 - ratio);
    return p;
  }
  denominator = (f2 + desired_extra);
  ratio = (f1 / denominator);
  p = (f1 - ratio);
  return p;
}

export function manyDrawsChoice(min_size: bigint, max_size: bigint, has_max: boolean): boolean {
  let fixed!: boolean;
  let bounded_and_fixed!: boolean;
  let varies!: boolean;
  fixed = (min_size === max_size);
  bounded_and_fixed = (has_max && fixed);
  varies = (!bounded_and_fixed);
  return varies;
}

export function manyForcedValue(force_stop: boolean, count: bigint, min_size: bigint, max_size: bigint, has_max: boolean, p_continue: number): boolean | null {
  let true_!: boolean;
  let false_!: boolean;
  let stop!: boolean | null;
  let below_minimum!: boolean;
  let go_!: boolean | null;
  let at_maximum!: boolean;
  let f0!: number;
  let f1!: number;
  let never!: boolean;
  let always!: boolean;
  let free!: boolean | null;
  true_ = true;
  false_ = false;
  if (force_stop) {
    stop = false_;
    return stop;
  }
  below_minimum = (count < min_size);
  if (below_minimum) {
    go_ = true_;
    return go_;
  }
  if (has_max) {
    at_maximum = (count >= max_size);
    if (at_maximum) {
      stop = false_;
      return stop;
    }
  }
  f0 = 0;
  f1 = 1;
  never = (p_continue <= f0);
  if (never) {
    stop = false_;
    return stop;
  }
  always = (p_continue >= f1);
  if (always) {
    go_ = true_;
    return go_;
  }
  free = null;
  return free;
}

export function filterRetryAllowed(attempts: bigint): boolean {
  let u3!: bigint;
  let allowed!: boolean;
  u3 = 3n;
  allowed = (attempts < u3);
  return allowed;
}

export function manyRejectionBudget(count: bigint): bigint {
  let i0!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u_max!: bigint;
  let half_max!: bigint;
  let zero!: bigint;
  let accepted!: bigint;
  let positive!: boolean;
  let magnitude!: bigint;
  let ceiling!: bigint;
  let doubled!: bigint;
  let fits!: boolean;
  let budget!: bigint;
  let below_floor!: boolean;
  i0 = 0n;
  u2 = 2n;
  u3 = 3n;
  u_max = 18446744073709551615n;
  half_max = 9223372036854775807n;
  zero = i0;
  accepted = zero;
  positive = (count > i0);
  if (positive) {
    accepted = count;
  }
  magnitude = (accepted & MASK);
  ceiling = u_max;
  doubled = ceiling;
  fits = (magnitude <= half_max);
  if (fits) {
    doubled = ((magnitude * u2) & MASK);
  }
  budget = doubled;
  below_floor = (doubled < u3);
  if (below_floor) {
    budget = u3;
  }
  return budget;
}

export function manyRejectAction(rejections: bigint, count: bigint, min_size: bigint): bigint {
  let retry_!: bigint;
  let stop!: bigint;
  let invalid!: bigint;
  let budget!: bigint;
  let over_budget!: boolean;
  let within_budget!: boolean;
  let below_minimum!: boolean;
  retry_ = 0n;
  stop = 1n;
  invalid = 2n;
  budget = manyRejectionBudget(count);
  over_budget = (rejections > budget);
  within_budget = (!over_budget);
  if (within_budget) {
    return retry_;
  }
  below_minimum = (count < min_size);
  if (below_minimum) {
    return invalid;
  }
  return stop;
}

export function replayInteger(stream: Uint8Array, offset: bigint, min_value: Uint8Array, max_value: Uint8Array, target: Uint8Array): Uint8Array {
  let entry!: Uint8Array | null;
  let present!: boolean;
  let recorded!: number[];
  let usable!: boolean;
  let punned!: number[];
  entry = deserializeIntegerChoice(stream, offset);
  present = (entry !== null);
  if (present) {
    recorded = Array.from(entry!);
    usable = integerValidate(min_value, max_value, Uint8Array.from(recorded));
    if (usable) {
      return Uint8Array.from(recorded);
    }
  }
  punned = Array.from(integerUnit(min_value, max_value, target));
  return Uint8Array.from(punned);
}

export function replayBoolean(stream: Uint8Array, offset: bigint): boolean {
  let entry!: boolean | null;
  let present!: boolean;
  let recorded!: boolean;
  let punned!: boolean;
  entry = deserializeBooleanChoice(stream, offset);
  present = (entry !== null);
  if (present) {
    recorded = entry!;
    return recorded;
  }
  punned = true;
  return punned;
}

export function replayFloat(stream: Uint8Array, offset: bigint, min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number): number | null {
  let entry!: number | null;
  let present!: boolean;
  let recorded!: number;
  let usable!: boolean;
  let found!: number | null;
  let punned!: number | null;
  entry = deserializeFloatChoice(stream, offset);
  present = (entry !== null);
  if (present) {
    recorded = entry!;
    usable = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, recorded);
    if (usable) {
      found = recorded;
      return found;
    }
  }
  punned = floatUnit(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero);
  return punned;
}

export function replayBytes(stream: Uint8Array, offset: bigint, min_size: bigint, max_size: bigint): Uint8Array {
  let entry!: Uint8Array | null;
  let present!: boolean;
  let recorded!: number[];
  let usable!: boolean;
  let punned!: number[];
  entry = deserializeBytesChoice(stream, offset);
  present = (entry !== null);
  if (present) {
    recorded = Array.from(entry!);
    usable = bytesValidate(min_size, max_size, Uint8Array.from(recorded));
    if (usable) {
      return Uint8Array.from(recorded);
    }
  }
  punned = Array.from(bytesUnit(min_size, max_size));
  return Uint8Array.from(punned);
}

export function replayString(stream: Uint8Array, offset: bigint, alphabet: Uint8Array, min_size: bigint, max_size: bigint): Uint8Array {
  let entry!: Uint8Array | null;
  let present!: boolean;
  let recorded!: number[];
  let usable!: boolean;
  let punned!: number[];
  entry = deserializeStringChoice(stream, offset);
  present = (entry !== null);
  if (present) {
    recorded = Array.from(entry!);
    usable = stringValidate(alphabet, min_size, max_size, Uint8Array.from(recorded));
    if (usable) {
      return Uint8Array.from(recorded);
    }
  }
  punned = Array.from(stringUnit(alphabet, min_size, max_size));
  return Uint8Array.from(punned);
}

export function replayIntegerPuns(stream: Uint8Array, offset: bigint, min_value: Uint8Array, max_value: Uint8Array): boolean {
  let false_!: boolean;
  let true_!: boolean;
  let entry!: Uint8Array | null;
  let present!: boolean;
  let recorded!: number[];
  let usable!: boolean;
  false_ = false;
  true_ = true;
  entry = deserializeIntegerChoice(stream, offset);
  present = (entry !== null);
  if (present) {
    recorded = Array.from(entry!);
    usable = integerValidate(min_value, max_value, Uint8Array.from(recorded));
    if (usable) {
      return false_;
    }
  }
  return true_;
}

export function replayBooleanPuns(stream: Uint8Array, offset: bigint): boolean {
  let entry!: boolean | null;
  let present!: boolean;
  let punned!: boolean;
  entry = deserializeBooleanChoice(stream, offset);
  present = (entry !== null);
  punned = (!present);
  return punned;
}

export function replayFloatPuns(stream: Uint8Array, offset: bigint, min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number): boolean {
  let false_!: boolean;
  let true_!: boolean;
  let entry!: number | null;
  let present!: boolean;
  let recorded!: number;
  let usable!: boolean;
  false_ = false;
  true_ = true;
  entry = deserializeFloatChoice(stream, offset);
  present = (entry !== null);
  if (present) {
    recorded = entry!;
    usable = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, recorded);
    if (usable) {
      return false_;
    }
  }
  return true_;
}

export function replayBytesPuns(stream: Uint8Array, offset: bigint, min_size: bigint, max_size: bigint): boolean {
  let false_!: boolean;
  let true_!: boolean;
  let entry!: Uint8Array | null;
  let present!: boolean;
  let recorded!: number[];
  let usable!: boolean;
  false_ = false;
  true_ = true;
  entry = deserializeBytesChoice(stream, offset);
  present = (entry !== null);
  if (present) {
    recorded = Array.from(entry!);
    usable = bytesValidate(min_size, max_size, Uint8Array.from(recorded));
    if (usable) {
      return false_;
    }
  }
  return true_;
}

export function replayStringPuns(stream: Uint8Array, offset: bigint, alphabet: Uint8Array, min_size: bigint, max_size: bigint): boolean {
  let false_!: boolean;
  let true_!: boolean;
  let entry!: Uint8Array | null;
  let present!: boolean;
  let recorded!: number[];
  let usable!: boolean;
  false_ = false;
  true_ = true;
  entry = deserializeStringChoice(stream, offset);
  present = (entry !== null);
  if (present) {
    recorded = Array.from(entry!);
    usable = stringValidate(alphabet, min_size, max_size, Uint8Array.from(recorded));
    if (usable) {
      return false_;
    }
  }
  return true_;
}

export function keyAppendInt(encoded: Uint8Array, value_raw: Uint8Array): Uint8Array {
  let tag!: bigint;
  let out!: number[];
  let value!: number[];
  let length_i64!: bigint;
  let length!: bigint;
  let length_bytes!: number[];
  let with_length!: number[];
  let component!: number[];
  let result!: number[];
  tag = 0n;
  out = [];
  out.push(Number(tag & 0xffn));
  value = Array.from(canonicalizeSignedLe(value_raw));
  length_i64 = blen(value);
  length = (length_i64 & MASK);
  length_bytes = Array.from(u32ToLe(length));
  with_length = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(length_bytes)));
  component = Array.from(appendBytes(Uint8Array.from(with_length), Uint8Array.from(value)));
  result = Array.from(appendBytes(encoded, Uint8Array.from(component)));
  return Uint8Array.from(result);
}

export function keyAppendText(encoded: Uint8Array, value: Uint8Array): Uint8Array {
  let tag!: bigint;
  let out!: number[];
  let length_i64!: bigint;
  let length!: bigint;
  let length_bytes!: number[];
  let with_length!: number[];
  let component!: number[];
  let result!: number[];
  tag = 1n;
  out = [];
  out.push(Number(tag & 0xffn));
  length_i64 = blen(value);
  length = (length_i64 & MASK);
  length_bytes = Array.from(u32ToLe(length));
  with_length = Array.from(appendBytes(Uint8Array.from(out), Uint8Array.from(length_bytes)));
  component = Array.from(appendBytes(Uint8Array.from(with_length), value));
  result = Array.from(appendBytes(encoded, Uint8Array.from(component)));
  return Uint8Array.from(result);
}

export function keyHash(encoded: Uint8Array): bigint {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let u1!: bigint;
  let offset_basis!: bigint;
  let prime!: bigint;
  let length!: bigint;
  let hash!: bigint;
  let pos!: bigint;
  let done!: boolean;
  let byte_!: bigint;
  let reserved!: boolean;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  u1 = 1n;
  offset_basis = 14695981039346656037n;
  prime = 1099511628211n;
  length = blen(encoded);
  hash = offset_basis;
  pos = i0;
  for (;;) {
    done = (pos >= length);
    if (done) {
      break;
    }
    byte_ = bget(encoded, pos);
    hash = (hash ^ byte_);
    hash = ((hash * prime) & MASK);
    pos = (pos + i1);
  }
  reserved = (hash === u0);
  if (reserved) {
    return u1;
  }
  return hash;
}

export function targetingScheduleStep(max_test_cases: bigint): bigint {
  let u1!: bigint;
  let u10!: bigint;
  let u50!: bigint;
  let ten!: number[];
  let max_big!: number[];
  let tenth_big!: number[];
  let tenth_opt!: bigint | null;
  let tenth!: bigint;
  let cap_!: bigint;
  let over_fifty!: boolean;
  let half!: bigint;
  let step!: bigint;
  let half_wins!: boolean;
  let below_floor!: boolean;
  u1 = 1n;
  u10 = 10n;
  u50 = 50n;
  ten = Array.from(u64ToBigintLe(u10));
  max_big = Array.from(u64ToBigintLe(max_test_cases));
  tenth_big = Array.from(positiveDivLeNonzero(Uint8Array.from(max_big), Uint8Array.from(ten)));
  tenth_opt = bigintToU64Le(Uint8Array.from(tenth_big));
  tenth = tenth_opt!;
  cap_ = tenth;
  over_fifty = (cap_ > u50);
  if (over_fifty) {
    cap_ = u50;
  }
  half = (max_test_cases >> u1);
  step = ((cap_ + u1) & MASK);
  half_wins = (half > step);
  if (half_wins) {
    step = half;
  }
  below_floor = (step < u10);
  if (below_floor) {
    step = u10;
  }
  return step;
}

export function targetingShouldFire(valid: bigint, next_at: bigint): boolean {
  let fire!: boolean;
  fire = (valid >= next_at);
  return fire;
}

export function targetingNextThreshold(next_at: bigint, step: bigint): bigint {
  let max!: bigint;
  let room!: bigint;
  let overflows!: boolean;
  let sum!: bigint;
  max = 18446744073709551615n;
  room = ((max - step) & MASK);
  overflows = (next_at > room);
  if (overflows) {
    return max;
  }
  sum = ((next_at + step) & MASK);
  return sum;
}

export function targetingTrialBudget(max_test_cases: bigint): bigint {
  let u10!: bigint;
  let max!: bigint;
  let room!: bigint;
  let overflows!: boolean;
  let budget!: bigint;
  u10 = 10n;
  max = 18446744073709551615n;
  room = 1844674407370955161n;
  overflows = (max_test_cases > room);
  if (overflows) {
    return max;
  }
  budget = ((max_test_cases * u10) & MASK);
  return budget;
}

export function targetingImprovementAllowance(round: bigint): bigint {
  let u10!: bigint;
  let u61!: bigint;
  let max!: bigint;
  let too_far!: boolean;
  let allowance!: bigint;
  u10 = 10n;
  u61 = 61n;
  max = 18446744073709551615n;
  too_far = (round >= u61);
  if (too_far) {
    return max;
  }
  allowance = ((u10 << round) & MASK);
  return allowance;
}

export function targetingRecord(has_best: boolean, best_score: number, score: number): boolean {
  let true_!: boolean;
  let none_yet!: boolean;
  let improves!: boolean;
  true_ = true;
  none_yet = (!has_best);
  if (none_yet) {
    return true_;
  }
  improves = (score > best_score);
  return improves;
}

export function targetingAccept(new_score: number, current_score: number, new_count: bigint, current_count: bigint): bigint {
  let reject!: bigint;
  let lateral!: bigint;
  let improvement!: bigint;
  let worse!: boolean;
  let strict!: boolean;
  let grew!: boolean;
  reject = 0n;
  lateral = 1n;
  improvement = 2n;
  worse = (new_score < current_score);
  if (worse) {
    return reject;
  }
  strict = (new_score > current_score);
  if (strict) {
    return improvement;
  }
  grew = (new_count > current_count);
  if (grew) {
    return reject;
  }
  return lateral;
}

export function targetingStepCap(): bigint {
  let cap_!: bigint;
  cap_ = 1048576n;
  return cap_;
}

export function signedLeFromI64(value: bigint): Uint8Array {
  let i0!: bigint;
  let negative!: boolean;
  let negated!: bigint;
  let negated_u!: bigint;
  let magnitude!: number[];
  let out!: number[];
  let value_u!: bigint;
  let out_pos!: number[];
  i0 = 0n;
  negative = (value < i0);
  if (negative) {
    negated = (i0 - value);
    negated_u = (negated & MASK);
    magnitude = Array.from(u64ToBigintLe(negated_u));
    out = Array.from(signedNegateLe(Uint8Array.from(magnitude)));
    return Uint8Array.from(out);
  }
  value_u = (value & MASK);
  out_pos = Array.from(u64ToBigintLe(value_u));
  return Uint8Array.from(out_pos);
}

export function targetingStepInteger(min_value: Uint8Array, max_value: Uint8Array, value: Uint8Array, delta: bigint): Uint8Array | null {
  let delta_big!: number[];
  let stepped!: number[];
  let valid!: boolean;
  let out!: Uint8Array | null;
  let none!: Uint8Array | null;
  delta_big = Array.from(signedLeFromI64(delta));
  stepped = Array.from(signedAddLe(value, Uint8Array.from(delta_big)));
  valid = integerValidate(min_value, max_value, Uint8Array.from(stepped));
  if (valid) {
    out = Uint8Array.from(stepped);
    return out;
  }
  none = null;
  return none;
}

export function targetingStepBoolean(value: boolean, delta: bigint): boolean | null {
  let i0!: bigint;
  let i1!: bigint;
  let false_!: boolean;
  let true_!: boolean;
  let is_zero!: boolean;
  let same!: boolean | null;
  let negative!: boolean;
  let magnitude!: bigint;
  let is_down!: boolean;
  let down!: boolean | null;
  let none_down!: boolean | null;
  let is_up!: boolean;
  let up!: boolean | null;
  let none!: boolean | null;
  i0 = 0n;
  i1 = 1n;
  false_ = false;
  true_ = true;
  is_zero = (delta === i0);
  if (is_zero) {
    same = value;
    return same;
  }
  negative = (delta < i0);
  if (negative) {
    magnitude = (i0 - delta);
    is_down = (magnitude === i1);
    if (is_down) {
      down = false_;
      return down;
    }
    none_down = null;
    return none_down;
  }
  is_up = (delta === i1);
  if (is_up) {
    up = true_;
    return up;
  }
  none = null;
  return none;
}

export function targetingStepFloat(min_value: number, max_value: number, allow_nan: boolean, allow_infinity: boolean, smallest_nonzero: number, value: number, delta: bigint): number | null {
  let i0!: bigint;
  let negative!: boolean;
  let magnitude_i!: bigint;
  let magnitude_u!: bigint;
  let delta_f!: number;
  let stepped!: number;
  let valid!: boolean;
  let out!: number | null;
  let none!: number | null;
  i0 = 0n;
  negative = (delta < i0);
  magnitude_i = delta;
  if (negative) {
    magnitude_i = (i0 - delta);
  }
  magnitude_u = (magnitude_i & MASK);
  delta_f = Number(magnitude_u);
  if (negative) {
    delta_f = f64Neg(delta_f);
  }
  stepped = (value + delta_f);
  valid = floatValidate(min_value, max_value, allow_nan, allow_infinity, smallest_nonzero, stepped);
  if (valid) {
    out = stepped;
    return out;
  }
  none = null;
  return none;
}

export function targetingStepBytes(min_size: bigint, max_size: bigint, value: Uint8Array, delta: bigint): Uint8Array | null {
  let i0!: bigint;
  let i1!: bigint;
  let u0!: bigint;
  let n!: bigint;
  let le!: number[];
  let pos!: bigint;
  let at_start!: boolean;
  let byte_!: bigint;
  let delta_big!: number[];
  let sum!: number[];
  let zero!: number[];
  let sign!: bigint;
  let negative!: boolean;
  let none_negative!: Uint8Array | null;
  let sum_len!: bigint;
  let mag_len!: bigint;
  let empty!: boolean;
  let last_at!: bigint;
  let last!: bigint;
  let nonzero!: boolean;
  let width!: bigint;
  let narrow!: boolean;
  let out!: number[];
  let at!: bigint;
  let done!: boolean;
  let in_magnitude!: boolean;
  let digit!: bigint;
  let valid!: boolean;
  let some!: Uint8Array | null;
  let none!: Uint8Array | null;
  i0 = 0n;
  i1 = 1n;
  u0 = 0n;
  n = blen(value);
  le = [];
  pos = n;
  for (;;) {
    at_start = (pos <= i0);
    if (at_start) {
      break;
    }
    pos = (pos - i1);
    byte_ = bget(value, pos);
    le.push(Number(byte_ & 0xffn));
  }
  le.push(Number(u0 & 0xffn));
  delta_big = Array.from(signedLeFromI64(delta));
  sum = Array.from(signedAddLe(Uint8Array.from(le), Uint8Array.from(delta_big)));
  zero = Array.from(bigintZero());
  sign = signedCompareLe(Uint8Array.from(sum), Uint8Array.from(zero));
  negative = (sign < i0);
  if (negative) {
    none_negative = null;
    return none_negative;
  }
  sum_len = blen(sum);
  mag_len = sum_len;
  for (;;) {
    empty = (mag_len <= i0);
    if (empty) {
      break;
    }
    last_at = (mag_len - i1);
    last = bget(sum, last_at);
    nonzero = (last !== u0);
    if (nonzero) {
      break;
    }
    mag_len = last_at;
  }
  width = mag_len;
  narrow = (width < n);
  if (narrow) {
    width = n;
  }
  out = [];
  at = width;
  for (;;) {
    done = (at <= i0);
    if (done) {
      break;
    }
    at = (at - i1);
    in_magnitude = (at < mag_len);
    digit = u0;
    if (in_magnitude) {
      digit = bget(sum, at);
    }
    out.push(Number(digit & 0xffn));
  }
  valid = bytesValidate(min_size, max_size, Uint8Array.from(out));
  if (valid) {
    some = Uint8Array.from(out);
    return some;
  }
  none = null;
  return none;
}

export function findIntegerProbe(mode: bigint, a: bigint, b: bigint): bigint | null {
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let done!: boolean;
  let none!: bigint | null;
  let linear!: boolean;
  let probe_a!: bigint | null;
  let grow!: boolean;
  let probe_b!: bigint | null;
  let gap!: bigint;
  let half!: bigint;
  let mid!: bigint;
  let probe_mid!: bigint | null;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  done = (mode >= u3);
  if (done) {
    none = null;
    return none;
  }
  linear = (mode < u1);
  if (linear) {
    probe_a = a;
    return probe_a;
  }
  grow = (mode < u2);
  if (grow) {
    probe_b = b;
    return probe_b;
  }
  gap = ((b - a) & MASK);
  half = (gap >> u1);
  mid = ((a + half) & MASK);
  probe_mid = mid;
  return probe_mid;
}

export function findIntegerResult(mode: bigint, a: bigint, b: bigint): bigint | null {
  let u3!: bigint;
  let done!: boolean;
  let answer!: bigint | null;
  let none!: bigint | null;
  u3 = 3n;
  done = (mode >= u3);
  if (done) {
    answer = a;
    return answer;
  }
  none = null;
  return none;
}

export function findIntegerBracketMode(lo: bigint, hi: bigint): bigint {
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let next_!: bigint;
  let open!: boolean;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  next_ = ((lo + u1) & MASK);
  open = (next_ < hi);
  if (open) {
    return u2;
  }
  return u3;
}

export function findIntegerNextMode(mode: bigint, a: bigint, b: bigint, ok: boolean): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u4!: bigint;
  let half_max!: bigint;
  let done!: boolean;
  let linear!: boolean;
  let failed!: boolean;
  let still_small!: boolean;
  let grow!: boolean;
  let overflows!: boolean;
  let bracketed!: bigint;
  let gap!: bigint;
  let half!: bigint;
  let mid!: bigint;
  let above!: bigint;
  let below!: bigint;
  u0 = 0n;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u4 = 4n;
  half_max = 9223372036854775807n;
  done = (mode >= u3);
  if (done) {
    return u3;
  }
  linear = (mode < u1);
  if (linear) {
    failed = (!ok);
    if (failed) {
      return u3;
    }
    still_small = (a < u4);
    if (still_small) {
      return u0;
    }
    return u1;
  }
  grow = (mode < u2);
  if (grow) {
    if (ok) {
      overflows = (b > half_max);
      if (overflows) {
        return u3;
      }
      return u1;
    }
    bracketed = findIntegerBracketMode(a, b);
    return bracketed;
  }
  gap = ((b - a) & MASK);
  half = (gap >> u1);
  mid = ((a + half) & MASK);
  if (ok) {
    above = findIntegerBracketMode(mid, b);
    return above;
  }
  below = findIntegerBracketMode(a, mid);
  return below;
}

export function findIntegerNextA(mode: bigint, a: bigint, b: bigint, ok: boolean): bigint {
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u4!: bigint;
  let done!: boolean;
  let linear!: boolean;
  let failed!: boolean;
  let previous!: bigint;
  let still_small!: boolean;
  let next_!: bigint;
  let grow!: boolean;
  let gap!: bigint;
  let half!: bigint;
  let mid!: bigint;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u4 = 4n;
  done = (mode >= u3);
  if (done) {
    return a;
  }
  linear = (mode < u1);
  if (linear) {
    failed = (!ok);
    if (failed) {
      previous = ((a - u1) & MASK);
      return previous;
    }
    still_small = (a < u4);
    if (still_small) {
      next_ = ((a + u1) & MASK);
      return next_;
    }
    return u4;
  }
  grow = (mode < u2);
  if (grow) {
    if (ok) {
      return b;
    }
    return a;
  }
  if (ok) {
    gap = ((b - a) & MASK);
    half = (gap >> u1);
    mid = ((a + half) & MASK);
    return mid;
  }
  return a;
}

export function findIntegerNextB(mode: bigint, a: bigint, b: bigint, ok: boolean): bigint {
  let u1!: bigint;
  let u2!: bigint;
  let u3!: bigint;
  let u4!: bigint;
  let u5!: bigint;
  let half_max!: bigint;
  let done!: boolean;
  let linear!: boolean;
  let failed!: boolean;
  let still_small!: boolean;
  let grow!: boolean;
  let overflows!: boolean;
  let doubled!: bigint;
  let gap!: bigint;
  let half!: bigint;
  let mid!: bigint;
  u1 = 1n;
  u2 = 2n;
  u3 = 3n;
  u4 = 4n;
  u5 = 5n;
  half_max = 9223372036854775807n;
  done = (mode >= u3);
  if (done) {
    return b;
  }
  linear = (mode < u1);
  if (linear) {
    failed = (!ok);
    if (failed) {
      return b;
    }
    still_small = (a < u4);
    if (still_small) {
      return b;
    }
    return u5;
  }
  grow = (mode < u2);
  if (grow) {
    if (ok) {
      overflows = (b > half_max);
      if (overflows) {
        return b;
      }
      doubled = ((b * u2) & MASK);
      return doubled;
    }
    return b;
  }
  if (ok) {
    return b;
  }
  gap = ((b - a) & MASK);
  half = (gap >> u1);
  mid = ((a + half) & MASK);
  return mid;
}

export function recursiveLargeTargetProbability(): number {
  let probability!: number;
  probability = 0.75;
  return probability;
}

export function recursiveTargetDrawn(max_leaves: bigint): boolean {
  let u2!: bigint;
  let drawn!: boolean;
  u2 = 2n;
  drawn = (max_leaves >= u2);
  return drawn;
}

export function recursiveRetryAllowed(attempt: bigint): boolean {
  let u9!: bigint;
  let allowed!: boolean;
  u9 = 9n;
  allowed = (attempt < u9);
  return allowed;
}

export function recursiveEffectiveTarget(target: bigint, attempt: bigint): bigint {
  let u1!: bigint;
  let shifted!: bigint;
  let below_one!: boolean;
  u1 = 1n;
  shifted = (target >> attempt);
  below_one = (shifted < u1);
  if (below_one) {
    return u1;
  }
  return shifted;
}

export function recursiveArityEstimate(closed_children: bigint, closed_branches: bigint): number {
  let prior_children!: number;
  let prior_branches!: number;
  let children!: number;
  let branches!: number;
  let numerator!: number;
  let denominator!: number;
  let estimate!: number;
  prior_children = 0.5;
  prior_branches = 0.25;
  children = Number(closed_children);
  branches = Number(closed_branches);
  numerator = (prior_children + children);
  denominator = (prior_branches + branches);
  estimate = (numerator / denominator);
  return estimate;
}

export function recursiveBranchProbability(mean_arity: number, max_leaves: bigint): number {
  let f1!: number;
  let f0_95!: number;
  let u2!: bigint;
  let u4294967296!: bigint;
  let arity!: number;
  let arity_too_small!: boolean;
  let budget!: bigint;
  let budget_too_small!: boolean;
  let budget_too_large!: boolean;
  let budget_f!: number;
  let numerator!: number;
  let scaled_arity!: number;
  let denominator!: number;
  let probability!: number;
  let over_cap!: boolean;
  f1 = 1;
  f0_95 = 0.95;
  u2 = 2n;
  u4294967296 = 4294967296n;
  arity = mean_arity;
  arity_too_small = (arity < f1);
  if (arity_too_small) {
    arity = f1;
  }
  budget = max_leaves;
  budget_too_small = (budget < u2);
  if (budget_too_small) {
    budget = u2;
  }
  budget_too_large = (budget > u4294967296);
  if (budget_too_large) {
    budget = u4294967296;
  }
  budget_f = Number(budget);
  numerator = (budget_f - f1);
  scaled_arity = (budget_f * arity);
  denominator = (scaled_arity - f1);
  probability = (numerator / denominator);
  over_cap = (probability > f0_95);
  if (over_cap) {
    return f0_95;
  }
  return probability;
}

export function recursivePricedProbability(closed_children: bigint, closed_branches: bigint, attempt: bigint, target: bigint): number {
  let arity!: number;
  let attempt_f!: number;
  let priced_arity!: number;
  let effective!: bigint;
  let probability!: number;
  arity = recursiveArityEstimate(closed_children, closed_branches);
  attempt_f = Number(attempt);
  priced_arity = (arity + attempt_f);
  effective = recursiveEffectiveTarget(target, attempt);
  probability = recursiveBranchProbability(priced_arity, effective);
  return probability;
}

export function recursiveProfileBoundary(target: number, arity: number, tail_probability: number, max_depth: bigint): bigint {
  let u0!: bigint;
  let u1!: bigint;
  let u4096!: bigint;
  let f1!: number;
  let grow!: number;
  let horizon!: bigint;
  let too_far!: boolean;
  let tail_numerator!: number;
  let tail_times_arity!: number;
  let tail_denominator!: number;
  let lo!: number;
  let grow_times_arity!: number;
  let grow_stop!: number;
  let lift!: number;
  let hi!: number;
  let boundary!: bigint;
  let reached!: boolean;
  let at_horizon!: boolean;
  let done!: boolean;
  let next_lift!: number;
  let next_!: number;
  let gain!: number;
  let epsilon!: number;
  let plateau!: boolean;
  let lo_lift!: number;
  u0 = 0n;
  u1 = 1n;
  u4096 = 4096n;
  f1 = 1;
  grow = 0.95;
  horizon = max_depth;
  too_far = (horizon > u4096);
  if (too_far) {
    horizon = u4096;
  }
  tail_numerator = (f1 - tail_probability);
  tail_times_arity = (tail_probability * arity);
  tail_denominator = (f1 - tail_times_arity);
  lo = (tail_numerator / tail_denominator);
  grow_times_arity = (grow * arity);
  grow_stop = (f1 - grow);
  lift = (grow_times_arity * lo);
  hi = (grow_stop + lift);
  boundary = u0;
  for (;;) {
    reached = (hi >= target);
    at_horizon = (boundary >= horizon);
    done = (reached || at_horizon);
    if (done) {
      break;
    }
    next_lift = (grow_times_arity * hi);
    next_ = (grow_stop + next_lift);
    gain = (next_ - hi);
    epsilon = 0.000000001;
    plateau = (gain < epsilon);
    if (plateau) {
      break;
    }
    lo_lift = (grow_times_arity * lo);
    lo = (grow_stop + lo_lift);
    hi = next_;
    boundary = ((boundary + u1) & MASK);
  }
  return boundary;
}

export function recursiveProfileExpected(target: number, arity: number, tail_probability: number, max_depth: bigint): number {
  let u0!: bigint;
  let u1!: bigint;
  let f1!: number;
  let grow!: number;
  let zero_depth!: boolean;
  let boundary!: bigint;
  let tail_numerator!: number;
  let tail_times_arity!: number;
  let tail_denominator!: number;
  let lo!: number;
  let grow_times_arity!: number;
  let grow_stop!: number;
  let lo_lift!: number;
  let hi!: number;
  let at!: bigint;
  let done!: boolean;
  let next_lo_lift!: number;
  let next_hi_lift!: number;
  let hi_below!: boolean;
  let lo_above!: boolean;
  u0 = 0n;
  u1 = 1n;
  f1 = 1;
  grow = 0.95;
  zero_depth = (max_depth === u0);
  if (zero_depth) {
    return f1;
  }
  boundary = recursiveProfileBoundary(target, arity, tail_probability, max_depth);
  tail_numerator = (f1 - tail_probability);
  tail_times_arity = (tail_probability * arity);
  tail_denominator = (f1 - tail_times_arity);
  lo = (tail_numerator / tail_denominator);
  grow_times_arity = (grow * arity);
  grow_stop = (f1 - grow);
  lo_lift = (grow_times_arity * lo);
  hi = (grow_stop + lo_lift);
  at = u0;
  for (;;) {
    done = (at >= boundary);
    if (done) {
      break;
    }
    next_lo_lift = (grow_times_arity * lo);
    lo = (grow_stop + next_lo_lift);
    next_hi_lift = (grow_times_arity * hi);
    hi = (grow_stop + next_hi_lift);
    at = ((at + u1) & MASK);
  }
  hi_below = (hi <= target);
  if (hi_below) {
    return hi;
  }
  lo_above = (lo >= target);
  if (lo_above) {
    return lo;
  }
  return target;
}

export function recursiveDecisionProbability(max_depth: bigint, depth: bigint, target: bigint, attempt: bigint, closed_children: bigint, closed_branches: bigint): number {
  let f0!: number;
  let u1!: bigint;
  let at_cap!: boolean;
  let effective!: bigint;
  let single!: boolean;
  let priced!: number;
  let arity!: number;
  let attempt_f!: number;
  let priced_arity!: number;
  let u2!: bigint;
  let tail!: number;
  let target_f!: number;
  let boundary!: bigint;
  let before!: boolean;
  let grow!: number;
  let on_boundary!: boolean;
  let f1!: number;
  let tail_numerator!: number;
  let tail_times_arity!: number;
  let tail_denominator!: number;
  let lo!: number;
  let grow_times_arity!: number;
  let grow_stop!: number;
  let lo_lift!: number;
  let hi!: number;
  let at!: bigint;
  let done!: boolean;
  let next_lo_lift!: number;
  let next_hi_lift!: number;
  let hi_below!: boolean;
  let lo_above!: boolean;
  let gap!: number;
  let offset!: number;
  let fraction!: number;
  let probability_gap!: number;
  let scaled!: number;
  let interpolated!: number;
  f0 = 0;
  u1 = 1n;
  at_cap = (depth >= max_depth);
  if (at_cap) {
    return f0;
  }
  effective = recursiveEffectiveTarget(target, attempt);
  single = (effective === u1);
  if (single) {
    priced = recursivePricedProbability(closed_children, closed_branches, attempt, target);
    return priced;
  }
  arity = recursiveArityEstimate(closed_children, closed_branches);
  attempt_f = Number(attempt);
  priced_arity = (arity + attempt_f);
  u2 = 2n;
  tail = recursiveBranchProbability(priced_arity, u2);
  target_f = Number(effective);
  boundary = recursiveProfileBoundary(target_f, arity, tail, max_depth);
  before = (depth < boundary);
  if (before) {
    grow = 0.95;
    return grow;
  }
  on_boundary = (depth === boundary);
  if (on_boundary) {
    f1 = 1;
    grow = 0.95;
    tail_numerator = (f1 - tail);
    tail_times_arity = (tail * arity);
    tail_denominator = (f1 - tail_times_arity);
    lo = (tail_numerator / tail_denominator);
    grow_times_arity = (grow * arity);
    grow_stop = (f1 - grow);
    lo_lift = (grow_times_arity * lo);
    hi = (grow_stop + lo_lift);
    at = 0n;
    for (;;) {
      done = (at >= boundary);
      if (done) {
        break;
      }
      next_lo_lift = (grow_times_arity * lo);
      lo = (grow_stop + next_lo_lift);
      next_hi_lift = (grow_times_arity * hi);
      hi = (grow_stop + next_hi_lift);
      at = ((at + u1) & MASK);
    }
    hi_below = (hi <= target_f);
    if (hi_below) {
      return grow;
    }
    lo_above = (lo >= target_f);
    if (lo_above) {
      return tail;
    }
    gap = (hi - lo);
    offset = (target_f - lo);
    fraction = (offset / gap);
    probability_gap = (grow - tail);
    scaled = (probability_gap * fraction);
    interpolated = (tail + scaled);
    return interpolated;
  }
  return tail;
}

export function recursiveFinishMispriced(max_depth: bigint, target: bigint, attempt: bigint, leaves: bigint, closed_children: bigint, closed_branches: bigint, start_probability: number, reprices: bigint): boolean {
  let u1!: bigint;
  let u2!: bigint;
  let maxed!: boolean;
  let false_!: boolean;
  let effective!: bigint;
  let single!: boolean;
  let repriced!: number;
  let difference!: number;
  let threshold!: number;
  let mispriced!: boolean;
  let half_floor!: bigint;
  let remainder!: bigint;
  let half_ceil!: bigint;
  let too_small!: boolean;
  let arity!: number;
  let target_f!: number;
  let zero!: number;
  let reachable!: number;
  let f2!: number;
  let twice_reachable!: number;
  let reachable_enough!: boolean;
  u1 = 1n;
  u2 = 2n;
  maxed = (reprices >= u2);
  if (maxed) {
    false_ = false;
    return false_;
  }
  effective = recursiveEffectiveTarget(target, attempt);
  single = (effective === u1);
  if (single) {
    repriced = recursivePricedProbability(closed_children, closed_branches, attempt, target);
    difference = (repriced - start_probability);
    threshold = 0.05;
    mispriced = (difference > threshold);
    return mispriced;
  }
  half_floor = (effective >> u1);
  remainder = (effective & u1);
  half_ceil = ((half_floor + remainder) & MASK);
  too_small = (leaves < half_ceil);
  if (too_small) {
    arity = recursiveArityEstimate(closed_children, closed_branches);
    target_f = Number(effective);
    zero = 0;
    reachable = recursiveProfileExpected(target_f, arity, zero, max_depth);
    f2 = 2;
    twice_reachable = (reachable * f2);
    reachable_enough = (twice_reachable >= target_f);
    return reachable_enough;
  }
  false_ = false;
  return false_;
}
