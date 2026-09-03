import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const deploymentRoot = fileURLToPath(new URL('../', import.meta.url));
const checkPath = `${deploymentRoot}scripts/check-ntfy-public.sh`;
const checkSource = readFileSync(checkPath, 'utf8');

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function runCheck(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', [checkPath], {
      env: {
        ...process.env,
        NTFY_PUBLIC_BASE_URL: baseUrl,
        NTFY_PUBLIC_CONNECT_TIMEOUT: '2',
        NTFY_PUBLIC_REQUEST_TIMEOUT: '5',
        NTFY_PUBLIC_STREAM_TIMEOUT: '10',
        NTFY_PUBLIC_READY_TIMEOUT: '5',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('ntfy public check test timed out'));
    }, 20_000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr });
    });
  });
}

function makeSuccessfulNtfyServer(observations) {
  const jsonSubscribers = new Map();
  const sseSubscribers = new Map();

  return createServer((request, response) => {
    observations.userAgents.add(request.headers['user-agent']);
    const url = new URL(request.url, 'http://127.0.0.1');

    if (request.method === 'GET' && url.pathname === '/v1/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end('{"healthy":true}\n');
      return;
    }

    const streamMatch = url.pathname.match(/^\/([^/]+)\/(json|sse)$/);
    if (request.method === 'GET' && streamMatch) {
      const [, topic, format] = streamMatch;
      if (url.searchParams.get('poll') === '1') {
        observations.replayChecks += 1;
        response.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
        response.end('');
        return;
      }

      const event = JSON.stringify({
        id: 'test-open',
        time: 1,
        event: 'open',
        topic,
      });
      if (format === 'json') {
        response.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
        response.write(`${event}\n`);
        jsonSubscribers.set(topic, response);
      } else {
        response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
        response.write(`event: open\ndata: ${event}\n\n`);
        sseSubscribers.set(topic, response);
      }
      request.once('close', () => {
        jsonSubscribers.delete(topic);
        sseSubscribers.delete(topic);
      });
      return;
    }

    const publishMatch = url.pathname.match(/^\/([^/]+)$/);
    if (request.method === 'POST' && publishMatch) {
      const topic = publishMatch[1];
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        observations.publishes.push({
          topic,
          message: body,
          cache: request.headers.cache,
          firebase: request.headers.firebase,
        });
        const event = JSON.stringify({
          id: 'test-message',
          time: 2,
          event: 'message',
          topic,
          message: body,
        });
        jsonSubscribers.get(topic)?.write(`${event}\n`);
        sseSubscribers.get(topic)?.write(`data: ${event}\n\n`);
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(`${event}\n`);
      });
      return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('not found');
  });
}

test('ntfy public check has valid POSIX shell syntax and fixed safety controls', () => {
  const syntax = spawnSync('sh', ['-n', checkPath], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  assert.match(checkSource, /--header 'Cache: no'/);
  assert.match(checkSource, /--header 'Firebase: no'/);
  assert.match(checkSource, /openssl rand -hex/);
  assert.match(checkSource, /cf-mitigated/);
  assert.match(checkSource, /final_header_has NEL/);
  assert.match(checkSource, /final_header_has Report-To/);
  assert.doesNotMatch(checkSource, /Authorization:|Bearer |token=/i);
});

test('ntfy public check validates health, JSON/SSE delivery, and no replay', async () => {
  const observations = {
    publishes: [],
    replayChecks: 0,
    userAgents: new Set(),
  };
  const server = makeSuccessfulNtfyServer(observations);
  const address = await listen(server);
  try {
    const result = await runCheck(`http://127.0.0.1:${address.port}`);
    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /PASS \(no cached test content remains\)/);
    assert.equal(observations.publishes.length, 1);
    assert.equal(observations.publishes[0].cache, 'no');
    assert.equal(observations.publishes[0].firebase, 'no');
    assert.match(observations.publishes[0].topic, /^utilibre-check-[0-9a-f]{48}$/);
    assert.match(observations.publishes[0].message, /^utilibre-public-check-[0-9a-f]{32}$/);
    assert.equal(observations.replayChecks, 1);
    assert.equal(observations.userAgents.size, 1);
    assert.match([...observations.userAgents][0], /^curl\//);
  } finally {
    await close(server);
  }
});

test('ntfy public check rejects a Cloudflare challenge before publishing', async () => {
  let publishes = 0;
  const server = createServer((request, response) => {
    if (request.method === 'POST') publishes += 1;
    response.writeHead(403, {
      'Content-Type': 'text/html',
      'cf-mitigated': 'challenge',
    });
    response.end('<!doctype html><title>Challenge</title>');
  });
  const address = await listen(server);
  try {
    const result = await runCheck(`http://127.0.0.1:${address.port}`);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Cloudflare managed challenge/);
    assert.equal(publishes, 0);
  } finally {
    await close(server);
  }
});

for (const forbiddenHeader of ['NEL', 'Report-To']) {
  test(`ntfy public check rejects ${forbiddenHeader} on an accepted response`, async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, {
        'Content-Type': 'application/json',
        [forbiddenHeader]: '{"report_to":"cf-nel"}',
      });
      response.end('{"healthy":true}\n');
    });
    const address = await listen(server);
    try {
      const result = await runCheck(`http://127.0.0.1:${address.port}`);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, new RegExp(`forbidden ${forbiddenHeader} response header`));
    } finally {
      await close(server);
    }
  });
}

test('ntfy public check rejects a non-2xx response without publishing', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(503, { 'Content-Type': 'application/json' });
    response.end('{"healthy":false}\n');
  });
  const address = await listen(server);
  try {
    const result = await runCheck(`http://127.0.0.1:${address.port}`);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /returned HTTP 503 \(expected 2xx\)/);
  } finally {
    await close(server);
  }
});
