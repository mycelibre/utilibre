import { describe, expect, it } from 'vitest';
import { parsePageSelection } from '../../src/tools/pdf';
import { routePrivateUrl } from '../../src/tools/private-router';
import { decodeBase64, encodeBase64, transformUrl } from '../../src/tools/text';
import { sha2Digests } from '../../src/utilities/hashes';
import { secureRandomUuid } from '../../src/utilities/random';

describe('private URL routing', () => {
  it('recognizes allowlisted hosts and normalizes short YouTube links', () => {
    expect(routePrivateUrl('https://youtu.be/dQw4w9WgXcQ?t=12')).toEqual({ target: 'youtube', path: '/watch', search: '?v=dQw4w9WgXcQ&t=12' });
    expect(routePrivateUrl('https://www.reddit.com/r/privacy/comments/abc?sort=new&evil=x')).toEqual({ target: 'reddit', path: '/r/privacy/comments/abc', search: '?sort=new' });
    expect(routePrivateUrl('https://redd.it/abc123?context=3&after=cursor&redirect=https://evil.example')).toEqual({ target: 'reddit', path: '/abc123', search: '?context=3&after=cursor' });
  });

  it('rejects lookalikes, credentials, ports, private addresses, and non-HTTPS schemes', () => {
    for (const value of [
      'https://youtube.com.evil.example/watch?v=x',
      'https://user:pass@reddit.com/r/test',
      'https://imgur.com:8443/a/x',
      'http://youtube.com/watch?v=x',
      'https://127.0.0.1/watch?v=x',
      'https://reddit.com/r/privacy/%E0%A4%A',
      'javascript:alert(1)',
    ]) expect(routePrivateUrl(value)).toBeNull();
  });
});

describe('local text and PDF helpers', () => {
  it('generates secure UUIDv4 values and correct SHA-2 digests', async () => {
    expect(secureRandomUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(secureRandomUuid(true)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const input = new TextEncoder().encode('abc').buffer;
    const [sha256, sha512] = await sha2Digests(input);
    expect(toHex(sha256)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(toHex(sha512)).toBe('ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f');
    const [fallback256, fallback512] = await sha2Digests(input, true);
    expect(toHex(fallback256)).toBe(toHex(sha256));
    expect(toHex(fallback512)).toBe(toHex(sha512));
  });

  it('round-trips Unicode through Base64', () => {
    const text = 'Privacidad · útil · 🦉';
    expect(decodeBase64(encodeBase64(text))).toBe(text);
    expect(() => decodeBase64('%%%')).toThrow();
  });

  it('distinguishes component and complete URL encoding', () => {
    expect(transformUrl('a/b?c=d', 'component-encode')).toBe('a%2Fb%3Fc%3Dd');
    expect(transformUrl('a%2Fb%3Fc%3Dd', 'component-decode')).toBe('a/b?c=d');
    expect(transformUrl('https://example.com/a path?q=hello world', 'full-encode')).toBe('https://example.com/a%20path?q=hello%20world');
    expect(transformUrl('https://example.com/a%2Fb?raw=100%', 'full-encode')).toBe('https://example.com/a%2Fb?raw=100%25');
    expect(transformUrl('https://example.com/a%20path?q=hello%20world', 'full-decode')).toBe('https://example.com/a path?q=hello world');
  });

  it('parses page ranges and validates reorder permutations', () => {
    expect(parsePageSelection('1,3-5', 5)).toEqual([1, 3, 4, 5]);
    expect(parsePageSelection('3,1,2', 3, true)).toEqual([3, 1, 2]);
    expect(() => parsePageSelection('1,1,2', 3, true)).toThrow();
    expect(() => parsePageSelection('0', 3)).toThrow();
  });
});

function toHex(value: Uint8Array): string {
  return [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
