// Installed CJS and ESM entry points. Small synthetic inputs; no network.
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const cp = require('node:child_process');
const path = require('node:path');
const root = process.argv[2], pkg = require(path.join(root, 'package.json'));
(async () => {
  const CJS = require(root);
  const ESM = (await import(pathToFileURL(path.join(root, 'dist/markdown-it.mjs')))).default;
  let normalChecks = 0;
  for (const Constructor of [CJS, ESM]) {
    const md = new Constructor({linkify: true});
    for (const [input, expected] of [
      ['# Fictional workshop', '<h1>Fictional workshop</h1>\n'],
      ['**Español** y ñ', '<p><strong>Español</strong> y ñ</p>\n'],
      ['<script>alert(1)</script>', '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>\n'],
      ['[safe](https://example.invalid/path)', '<p><a href="https://example.invalid/path">safe</a></p>\n'],
      ['[x][a]\n\n[a]: /local "first\nsecond"', '<p><a href="/local" title="first\nsecond">x</a></p>\n'],
      ['```text\n<fictional>\n```', '<pre><code class="language-text">&lt;fictional&gt;\n</code></pre>\n'],
      ['- first\n- second', '<ul>\n<li>first</li>\n<li>second</li>\n</ul>\n'],
    ]) { assert.equal(md.render(input), expected); normalChecks++; }
    assert(md.render('https://example.com/a').includes('href="https://example.com/a"')); normalChecks++;
    assert(!md.render('[bad](javascript:alert(1))').includes('href=')); normalChecks++;
    const table = md.render('| Task | Count |\n| --- | --- |\n| Fictional | 2 |');
    assert(table.includes('<table>') && table.includes('<td>2</td>')); normalChecks++;
  }
  const costs = [];
  for (const variant of ['label', 'title']) for (const count of [1000, 2000]) {
    const source = (variant === 'title' ? '[a]: /u "' : '[') + 'x\n'.repeat(count);
    const prefix = variant === 'title' ? '[a]: /u "' : '[x\n';
    const lengths = new Set(), original = String.prototype.charCodeAt;
    try {
      String.prototype.charCodeAt = function (position) {
        // Count distinct growing buffers inspected, not elapsed wall time.
        if (this.startsWith(prefix)) lengths.add(this.length);
        return original.call(this, position);
      };
      const md = new CJS(); md.core.ruler.disable('inline');
      md.parse(source, {});
    } finally { String.prototype.charCodeAt = original; }
    costs.push({variant, count, distinctBuffers: lengths.size, inspectedBufferCharacters: [...lengths].reduce((a, b) => a + b, 0)});
  }
  let cliPassed = false;
  if (pkg.version === '15.0.3') {
    const text = cp.execFileSync(process.execPath, [path.join(root, 'bin/markdown-it.mjs')], {input: '# Example\n', encoding: 'utf8', timeout: 5000});
    assert.equal(text, '<h1>Example</h1>\n'); cliPassed = true;
  }
  console.log(JSON.stringify({passed: true, version: pkg.version, normalChecks, costs, cliPassed,
    repeatedGrowingBuffers: costs.some(c => c.inspectedBufferCharacters > 1000000),
    scope: 'Exact installed APIs, bounded complexity instrumentation; no production requests or timing benchmark'}));
})().catch(e => { console.error(e); process.exitCode = 1; });
