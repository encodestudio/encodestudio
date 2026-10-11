// Django-compatible password hashes ("pbkdf2_sha256$<iter>$<salt>$<b64>").
// Web Crypto only, so this runs both in the Worker and in Node scripts.
//
// Workers' Web Crypto refuses more than 100,000 PBKDF2 iterations, and the
// Free plan allows ~10 ms of CPU per request, so new hashes use far fewer
// iterations than Django's 1,000,000. Accounts imported from Django keep their
// old hash and can't log in until reset with `npm run staff -- password <user>`.
export const HASH_ITERATIONS = 40_000;
export const MAX_ITERATIONS = 100_000;
const DIGESTS = { pbkdf2_sha256: "SHA-256", pbkdf2_sha1: "SHA-1" };
const SALT_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const encoder = new TextEncoder();

async function pbkdf2(password, salt, iterations, length, hash) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash, salt: encoder.encode(salt), iterations },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password, iterations = HASH_ITERATIONS) {
  const random = crypto.getRandomValues(new Uint8Array(22));
  const salt = Array.from(random, (n) => SALT_CHARS[n % SALT_CHARS.length]).join("");
  const hash = await pbkdf2(password, salt, iterations, 32, "SHA-256");
  return `pbkdf2_sha256$${iterations}$${salt}$${toBase64(hash)}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, iterations, salt, expected] = String(encoded || "").split("$");
  const hash = DIGESTS[algorithm];
  if (!hash || !salt || !expected) return false; // unusable or unsupported hash
  if (Number(iterations) > MAX_ITERATIONS) {
    console.warn(`Password hash uses ${iterations} iterations; reset it with \`npm run staff -- password <username>\`.`);
    return false;
  }
  const expectedBytes = fromBase64(expected);
  const actual = await pbkdf2(password, salt, Number(iterations), expectedBytes.length, hash);
  return constantTimeEqual(actual, expectedBytes);
}
