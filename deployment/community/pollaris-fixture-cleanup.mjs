import assert from 'node:assert/strict';

// Preserve the gateway's per-IP write limit. Retry a rejected cleanup after
// its token bucket has time to recover; never blindly retry other failures.
export async function removeSyntheticPoll(page, { title, adminBase, publicUrl }) {
  const origin = 'https://pollaris.utilibre.org';
  assert.match(title, /^Utilibre synthetic [0-9]{13}$/);
  assert.equal(new URL(adminBase).origin, origin);
  assert.match(new URL(adminBase).pathname, /^\/polls\/[^/]+\/[^/]+$/);
  if (publicUrl) assert.equal(new URL(publicUrl).origin, origin);
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 6000));
    const response = await page.goto(`${adminBase}/deletion`, { waitUntil: 'domcontentloaded' });
    if (response.status() === 429) continue;
    assert.equal(response.status(), 200, 'Synthetic deletion form must be accessible');
    assert.ok((await page.locator('body').innerText()).includes(title), 'Delete only the poll created by this test');
    const form = await page.locator('form').filter({ has: page.locator('[name="poll_deletion[submit]"]') }).evaluate(element => {
      const data = Object.fromEntries(new FormData(element));
      const submit = element.querySelector('[name="poll_deletion[submit]"]');
      data[submit.name] = submit.value;
      return { action: element.action, data };
    });
    // Symfony may canonicalize an accepted UUID into a different URL spelling.
    // Submit the actual native form, including its session-bound CSRF token.
    assert.equal(new URL(form.action).origin, origin);
    assert.match(new URL(form.action).pathname, /^\/polls\/[^/]+\/[^/]+\/deletion$/);
    // Use the browser network stack so --backend's loopback TLS routing is
    // preserved as well as the public mode's verified HTTPS and cookies.
    const result = await page.evaluate(async ({ action, data }) => {
      const response = await fetch(action, { method: 'POST', body: new URLSearchParams(data), redirect: 'manual' });
      return { status: response.status, type: response.type };
    }, form);
    if (result.status === 429) continue;
    assert.equal(result.type, 'opaqueredirect', `Synthetic deletion returned ${result.status}`);
    // The POST result is authoritative; loading the redirected page can race
    // with other browsers and need not finish before verifying removal.
    const verify = () => page.goto(publicUrl || `${adminBase}/admin`, { waitUntil: 'domcontentloaded' });
    const verification = await verify();
    if (verification.status() === 429) {
      await new Promise(resolve => setTimeout(resolve, 6000));
      assert.equal((await verify()).status(), 404);
    } else assert.equal(verification.status(), 404);
    return;
  }
  throw Error('Synthetic poll cleanup remained rate limited; use the private recovery manifest');
}
