import { chromium } from '@playwright/test';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PRIVATE_IP = process.env.APP_BIND_IP || '127.0.0.1';
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(testDirectory, '../../../deployment/utilibre/tests/fixtures');
const PRIVATEBIN_DATA = process.env.PRIVATEBIN_DATA;
const marker = `utilibre-privatebin-browser-test-${Date.now()}`;

const result = {
  runAt: new Date().toISOString(),
  bento: {},
  vert: {},
  omni: {},
  pairdrop: {},
  privatebin: {},
};

function installVirtualEdge(page, publicOrigin, privatePort) {
  return page.route(`${publicOrigin}/**`, async (route) => {
    const upstream = new URL(route.request().url());
    upstream.protocol = 'http:';
    upstream.hostname = PRIVATE_IP;
    upstream.port = String(privatePort);
    const response = await route.fetch({ url: upstream.toString(), timeout: 60_000 });
    await route.fulfill({ response });
  });
}

function monitorAfterLoad(page, markerText = '') {
  const requests = [];
  const listener = (request) => {
    const body = request.postData() || '';
    requests.push({
      method: request.method(),
      url: request.url().replace(/[?#].*$/, ''),
      resourceType: request.resourceType(),
      hasBody: body.length > 0,
      bodyContainsMarker: Boolean(markerText && body.includes(markerText)),
    });
  };
  page.on('request', listener);
  return {
    stop: () => page.off('request', listener),
    requests,
  };
}

function summarizeNetwork(requests, expectedOrigin, markerText = '') {
  const mutations = requests.filter(({ method }) => !['GET', 'HEAD', 'OPTIONS'].includes(method));
  const external = requests.filter(({ url }) => {
    try {
      return new URL(url).origin !== expectedOrigin;
    } catch {
      return false;
    }
  });
  return {
    requestCount: requests.length,
    mutationCount: mutations.length,
    externalCount: external.length,
    markerTransmitted: requests.some(({ bodyContainsMarker }) => bodyContainsMarker),
    requests,
    external,
    markerLength: markerText.length,
  };
}

async function walkFiles(root) {
  const found = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) found.push(file);
    }
  }
  await walk(root);
  return found;
}

const browser = await chromium.launch({ headless: true });

// BentoPDF: text -> PDF, using a virtual HTTPS origin backed by the private HTTP endpoint.
{
  const context = await browser.newContext({ acceptDownloads: true, locale: 'en-US' });
  const page = await context.newPage();
  const publicOrigin = 'https://pdf.utilibre.org';
  await installVirtualEdge(page, publicOrigin, 3101);
  const response = await page.goto(`${publicOrigin}/txt-to-pdf.html`, { waitUntil: 'networkidle', timeout: 60_000 });
  const headers = response.headers();
  const isolation = await page.evaluate(() => ({
    secureContext: window.isSecureContext,
    crossOriginIsolated: window.crossOriginIsolated,
    sharedArrayBuffer: typeof SharedArrayBuffer,
  }));
  const network = monitorAfterLoad(page, 'Utilibre browser-local acceptance test.');
  await page.getByRole('button', { name: 'Type Text', exact: true }).click();
  await page.locator('#text-input').fill('Utilibre browser-local acceptance test.');
  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  const bytes = await readFile(downloadPath);
  network.stop();
  result.bento = {
    pageStatus: response.status(),
    title: await page.title(),
    headers: {
      coop: headers['cross-origin-opener-policy'] || null,
      coep: headers['cross-origin-embedder-policy'] || null,
    },
    isolation,
    operation: {
      name: 'typed text to PDF',
      suggestedFilename: download.suggestedFilename(),
      outputBytes: bytes.length,
      pdfMagic: bytes.subarray(0, 5).toString() === '%PDF-',
    },
    network: summarizeNetwork(network.requests, publicOrigin, 'Utilibre browser-local acceptance test.'),
  };
  await context.close();
}

// VERT: SVG -> PNG and Markdown -> DOCX, fully in the browser.
{
  const context = await browser.newContext({ acceptDownloads: true, locale: 'en-US' });
  const page = await context.newPage();
  const publicOrigin = 'https://convert.utilibre.org';
  await installVirtualEdge(page, publicOrigin, 3102);
  const response = await page.goto(`${publicOrigin}/`, { waitUntil: 'networkidle', timeout: 60_000 });
  const network = monitorAfterLoad(page, 'Utilibre browser-local acceptance test.');
  await page.locator('input[type=file]').setInputFiles(path.join(FIXTURES, 'local-operation.svg'));
  await page.waitForURL('**/convert/');
  await page.getByRole('button', { name: 'Convert all', exact: true }).click();
  await page.getByRole('button', { name: 'Download all as .zip', exact: true }).waitFor({ state: 'visible', timeout: 120_000 });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === 'Download all as .zip');
    return button && !button.disabled;
  }, null, { timeout: 120_000 });
  const imageDownloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  // The individual download is the final enabled icon-only button in the converted row.
  const enabledIconButtons = page.locator('button:enabled').filter({ hasText: /^$/ });
  await enabledIconButtons.nth((await enabledIconButtons.count()) - 1).click();
  const imageDownload = await imageDownloadPromise;
  const imageBytes = await readFile(await imageDownload.path());

  await page.goto(`${publicOrigin}/`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.locator('input[type=file]').setInputFiles(path.join(FIXTURES, 'local-operation.md'));
  await page.waitForURL('**/convert/');
  const outputButton = page.getByRole('button', { name: /\.(docx|html|pdf|odt|rtf)$/ }).first();
  const selectedOutput = await outputButton.evaluate((button) =>
    [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)?.textContent?.trim() || 'unknown'
  );
  await page.getByRole('button', { name: 'Convert all', exact: true }).click();
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === 'Download all as .zip');
    return button && !button.disabled;
  }, null, { timeout: 120_000 });
  network.stop();
  result.vert = {
    pageStatus: response.status(),
    title: await page.title(),
    operations: [
      {
        name: 'SVG image conversion',
        suggestedFilename: imageDownload.suggestedFilename(),
        outputBytes: imageBytes.length,
      },
      {
        name: 'Markdown document conversion',
        selectedOutput,
        conversionCompleted: true,
      },
    ],
    network: summarizeNetwork(network.requests, publicOrigin, 'Utilibre browser-local acceptance test.'),
  };
  await context.close();
}

// OmniTools: JSON validation.
{
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  const publicOrigin = 'https://tools.utilibre.org';
  await installVirtualEdge(page, publicOrigin, 3103);
  const response = await page.goto(`${publicOrigin}/json/validateJson`, { waitUntil: 'networkidle', timeout: 60_000 });
  const network = monitorAfterLoad(page, 'utilibre-local-json-marker');
  await page.getByLabel('Editor content').fill('{"marker":"utilibre-local-json-marker","value":42}');
  await page.waitForFunction(() => document.body.innerText.includes('Valid JSON'));
  network.stop();
  result.omni = {
    pageStatus: response.status(),
    title: await page.title(),
    operation: { name: 'JSON validation', validResultShown: true },
    network: summarizeNetwork(network.requests, publicOrigin, 'utilibre-local-json-marker'),
  };
  await context.close();
}

// PairDrop: two independent sessions, WebSocket, WebRTC text and file transfer.
{
  const sessions = [];
  for (let index = 0; index < 2; index += 1) {
    const context = await browser.newContext({ acceptDownloads: true, locale: 'en-US' });
    const page = await context.newPage();
    const sockets = [];
    page.on('websocket', (socket) => {
      const record = { url: socket.url(), framesSent: 0, framesReceived: 0, errors: 0, closed: false };
      sockets.push(record);
      socket.on('framesent', () => record.framesSent += 1);
      socket.on('framereceived', () => record.framesReceived += 1);
      socket.on('socketerror', () => record.errors += 1);
      socket.on('close', () => record.closed = true);
    });
    const response = await page.goto(`http://${PRIVATE_IP}:3105/`, { waitUntil: 'networkidle', timeout: 60_000 });
    sessions.push({ context, page, sockets, status: response.status() });
  }
  await Promise.all(sessions.map(({ page }) => page.locator('x-peer').waitFor({ timeout: 30_000 })));
  const senderPeerId = await sessions[0].page.locator('x-peer').getAttribute('id');
  const textMarker = `PairDrop text test ${Date.now()}`;
  await sessions[0].page.evaluate(({ to, text }) => Events.fire('send-text', { to, text }), { to: senderPeerId, text: textMarker });
  await sessions[1].page.locator('#receive-text-dialog #text').waitFor({ state: 'visible', timeout: 30_000 });
  const receivedText = await sessions[1].page.locator('#receive-text-dialog #text').innerText();
  await sessions[1].page.locator('#receive-text-dialog #close').click();

  const fileDownloadPromise = sessions[1].page.waitForEvent('download', { timeout: 60_000 });
  await sessions[0].page.locator('x-peer input[type=file]').setInputFiles(path.join(FIXTURES, 'local-operation.txt'));
  await sessions[1].page.waitForFunction(() => {
    const dialog = document.querySelector('#receive-request-dialog');
    const button = document.querySelector('#accept-request');
    return dialog?.hasAttribute('show') && button && !button.disabled;
  }, null, { timeout: 30_000 });
  await sessions[1].page.locator('#accept-request').evaluate((button) => button.click());
  const fileDownload = await fileDownloadPromise;
  const receivedFile = await readFile(await fileDownload.path(), 'utf8');
  result.pairdrop = {
    pageStatuses: sessions.map(({ status }) => status),
    peerDiscovery: await Promise.all(sessions.map(({ page }) => page.locator('x-peer').count())),
    websockets: sessions.map(({ sockets }) => sockets),
    textTransfer: receivedText === textMarker,
    fileTransfer: {
      suggestedFilename: fileDownload.suggestedFilename(),
      contentMatched: receivedFile.includes('Utilibre browser-local acceptance test.'),
      bytes: Buffer.byteLength(receivedFile),
    },
  };
  for (const { context } of sessions) await context.close();
}

// PrivateBin: encrypted burn-after-reading paste through a virtual HTTPS origin.
{
  if (!PRIVATEBIN_DATA) {
    throw new Error('Set PRIVATEBIN_DATA to the live PrivateBin data directory before running this operational test.');
  }
  const before = new Set(await walkFiles(PRIVATEBIN_DATA));
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  const publicOrigin = 'https://paste.utilibre.org';
  await installVirtualEdge(page, publicOrigin, 3108);
  const response = await page.goto(`${publicOrigin}/`, { waitUntil: 'networkidle', timeout: 60_000 });
  const secure = await page.evaluate(() => ({ secureContext: window.isSecureContext, webCrypto: typeof crypto?.subtle }));
  const createResponses = [];
  page.on('response', async (networkResponse) => {
    if (networkResponse.request().method() === 'POST') {
      try {
        createResponses.push(await networkResponse.json());
      } catch {
        // Ignore non-JSON responses; the create result is the JSON response.
      }
    }
  });
  await page.locator('#message').fill(marker);
  await page.locator('#burnafterreading').check();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.waitForFunction(() => location.hash.length > 10, null, { timeout: 30_000 });
  const completeUrl = page.url();
  await page.waitForTimeout(1_000);
  const createPayload = createResponses.find((payload) => typeof payload?.id === 'string');
  const pasteId = createPayload?.id || '';
  const expectedPasteFile = pasteId
    ? path.join(PRIVATEBIN_DATA, pasteId.slice(0, 2), pasteId.slice(2, 4), `${pasteId}.php`)
    : '';
  const afterCreate = await walkFiles(PRIVATEBIN_DATA);
  const createdFiles = afterCreate.filter((file) => !before.has(file));
  const stored = await Promise.all(createdFiles.map(async (file) => ({
    file,
    bytes: (await stat(file)).size,
    containsPlaintext: (await readFile(file)).includes(Buffer.from(marker)),
  })));

  const readerContext = await browser.newContext({ locale: 'en-US' });
  const reader = await readerContext.newPage();
  await installVirtualEdge(reader, publicOrigin, 3108);
  await reader.goto(completeUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await reader.getByRole('button', { name: 'Yes, see it', exact: true }).click();
  await reader.waitForFunction((text) => document.body.innerText.includes(text), marker, { timeout: 30_000 });
  const plaintextRetrieved = (await reader.locator('body').innerText()).includes(marker);
  await readerContext.close();
  await page.close();
  await context.close();
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  const afterBurn = new Set(await walkFiles(PRIVATEBIN_DATA));
  result.privatebin = {
    pageStatus: response.status(),
    secure,
    createResponseReceived: createResponses.length > 0,
    completeUrlHasFragmentKey: new URL(completeUrl).hash.length > 10,
    createdFileCount: createdFiles.length,
    pasteFileIdentified: Boolean(expectedPasteFile && createdFiles.includes(expectedPasteFile)),
    pasteFileEncrypted: Boolean(expectedPasteFile && stored.find(({ file }) => file === expectedPasteFile)?.containsPlaintext === false),
    stored: stored.map(({ file, ...entry }) => ({ ...entry, file: path.relative(PRIVATEBIN_DATA, file) })),
    plaintextRetrieved,
    burnRemovedPasteFile: Boolean(expectedPasteFile && !afterBurn.has(expectedPasteFile)),
  };
}

await browser.close();
console.log(JSON.stringify(result, null, 2));
