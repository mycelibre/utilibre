// Shared security fix for the pinned password/token generators. No fallback PRNG.
export function utilibreSecureToken(alphabet, length) {
  if (!alphabet || !Number.isSafeInteger(length) || length <= 0) return '';
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random generation is unavailable in this browser.');
  }
  const limit = 0x100000000 - (0x100000000 % alphabet.length);
  const random = new Uint32Array(128);
  let result = '';
  while (result.length < length) {
    globalThis.crypto.getRandomValues(random);
    for (const value of random) {
      // Reject the incomplete range before taking a remainder: no modulo bias.
      if (value < limit) result += alphabet[value % alphabet.length];
      if (result.length === length) break;
    }
  }
  return result;
}
