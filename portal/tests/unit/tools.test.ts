import { describe, expect, it } from 'vitest';
import { routePrivateUrl } from '../../src/tools/private-router';
import { secureRandomUuid } from '../../src/utilities/random';

describe('private URL routing', () => {
  it('recognizes allowlisted Reddit hosts and keeps only supported parameters', () => {
    expect(routePrivateUrl('https://www.reddit.com/r/privacy/comments/abc?sort=new&evil=x')).toEqual({ target: 'reddit', path: '/r/privacy/comments/abc', search: '?sort=new' });
    expect(routePrivateUrl('https://redd.it/abc123?context=3&after=cursor&redirect=https://evil.example')).toEqual({ target: 'reddit', path: '/abc123', search: '?context=3&after=cursor' });
  });

  it('rejects lookalikes, credentials, ports, private addresses, and non-HTTPS schemes', () => {
    for (const value of [
      'https://youtube.com.evil.example/watch?v=x',
      'https://youtu.be/dQw4w9WgXcQ?t=12',
      'https://user:pass@reddit.com/r/test',
      'https://imgur.com:8443/a/x',
      'http://youtube.com/watch?v=x',
      'https://127.0.0.1/watch?v=x',
      'https://reddit.com/r/privacy/%E0%A4%A',
      'javascript:alert(1)',
    ]) expect(routePrivateUrl(value)).toBeNull();
  });
});

describe('portal glue identifiers', () => {
  it('generates secure UUIDv4 values for labelled controls', () => {
    expect(secureRandomUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(secureRandomUuid(true)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
