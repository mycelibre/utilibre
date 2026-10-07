import { describe, expect, it } from 'vitest';
import { routePrivateUrl } from '../../src/tools/private-router';
import { secureRandomUuid } from '../../src/utilities/random';

describe('private URL routing', () => {
  it('recognizes reviewed paths, preserving semantics and stripping named trackers only', () => {
    expect(routePrivateUrl('https://www.reddit.com/r/privacy/comments/abc?sort=new&custom=x&utm_source=share#comment')).toEqual({ target: 'reddit', path: '/r/privacy/comments/abc', search: '?sort=new&custom=x', hash: '#comment' });
    expect(routePrivateUrl('http://redd.it/abc123?context=3&after=cursor')).toEqual({ target: 'reddit', path: '/comments/abc123', search: '?context=3&after=cursor', hash: '' });
    expect(routePrivateUrl('https://reddit.com/r/privacy/search?q=a%20b&q=c&sort=new')?.search).toBe('?q=a%20b&q=c&sort=new');
    expect(routePrivateUrl('https://www.reddit.com/r/Guatemala/?sort=new&t=week#posts')).toEqual({ target: 'reddit', path: '/r/Guatemala/new/', search: '?sort=new&t=week', hash: '#posts' });
  });

  it('rejects lookalikes, credentials, ports, private addresses, and non-HTTPS schemes', () => {
    for (const value of [
      'https://youtube.com.evil.example/watch?v=x',
      'https://youtu.be/dQw4w9WgXcQ?t=12',
      'https://user:pass@reddit.com/r/test',
      'https://@reddit.com/r/test', 'https://reddit.com/r/test?sort=new&sort=top', 'https://reddit.com/r/test?sort=best',
      'https://imgur.com:8443/a/x',
      'http://youtube.com/watch?v=x',
      'https://127.0.0.1/watch?v=x',
      'https://reddit.com/r/privacy/%E0%A4%A',
      'javascript:alert(1)',
      'https://reddit.com.evil.test/r/test', 'https://evil.reddit.com/r/test',
      'https://reddit.com/settings/update?theme=evil', 'https://reddit.com/r/test/s/abcdefghij',
      'https://reddit.com/r/a%2fb', 'https://reddit.com/r/test/../settings',
      'https://reddit.com/r/test/%2e%2e/settings', 'https://reddit.com/r/test?x=%ZZ',
    ]) expect(routePrivateUrl(value)).toBeNull();
  });
});

describe('portal glue identifiers', () => {
  it('generates secure UUIDv4 values for labelled controls', () => {
    expect(secureRandomUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(secureRandomUuid(true)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
