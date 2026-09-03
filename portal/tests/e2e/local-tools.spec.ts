import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from '@cantoo/pdf-lib';
import { readFile } from 'node:fs/promises';
import { catalog } from '../../src/catalog/catalog';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const functionallyCoveredToolIds = [
  'private-router',
  'image-resize',
  'image-compress',
  'image-convert',
  'image-metadata',
  'pdf-merge',
  'pdf-extract',
  'pdf-rotate',
  'pdf-reorder',
  'file-hashes',
  'file-info',
  'json',
  'base64',
  'url-encoding',
  'uuid',
  'webhook-signature',
  'openapi',
  'jwt-inspect',
  'jwt-generate',
  'http-curl',
  'regex',
  'cron',
  'timestamp',
  'text-hashes',
  'qr-generate',
  'qr-read',
] as const;

test('functional scenarios account for every local catalog tool', () => {
  const catalogToolIds = catalog
    .filter((entry) => entry.kind === 'tool' && (entry.id === 'private-router' || (entry.labels.length === 1 && entry.labels[0] === 'local')))
    .map((entry) => entry.id)
    .sort();
  expect([...functionallyCoveredToolIds].sort()).toEqual(catalogToolIds);
});

async function assertNoProcessingNetwork(page: Page, action: () => Promise<void>): Promise<void> {
  const requests: string[] = [];
  const sockets: string[] = [];
  const listener = (request: { url(): string }) => {
    const url = request.url();
    if (url.startsWith('http://') || url.startsWith('https://')) requests.push(url);
  };
  const socketListener = (socket: { url(): string }) => sockets.push(socket.url());
  page.on('request', listener);
  page.on('websocket', socketListener);
  await action();
  await page.waitForTimeout(250);
  page.off('request', listener);
  page.off('websocket', socketListener);
  expect(requests, `unexpected request after tool assets were ready: ${requests.join(', ')}`).toEqual([]);
  expect(sockets, `unexpected WebSocket after tool assets were ready: ${sockets.join(', ')}`).toEqual([]);
}

async function settleToolAssets(page: Page): Promise<void> {
  await expect(page.locator('.tool-panel')).toBeVisible();
  await page.waitForLoadState('networkidle');
}

test('image processing stays local after assets load', async ({ page }) => {
  await page.goto('/en/tools/image-resize');
  await settleToolAssets(page);
  await assertNoProcessingNetwork(page, async () => {
    await page.locator('input[type=file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('status')).toContainText('1 × 1');
    await page.locator('input[type=number]').first().fill('2');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Resize and download' }).click();
    const completed = await download;
    expect(completed.suggestedFilename()).toContain('resize');
    const path = await completed.path();
    expect(path).toBeTruthy();
    const output = await readFile(path!);
    expect(output.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(output.readUInt32BE(16)).toBe(2);
    expect(output.readUInt32BE(20)).toBe(2);
  });
  await expect(page.getByRole('status')).toContainText('Done');
  await expect(page.getByRole('button', { name: 'Resize and download' })).toBeFocused();
});

test('image compression, PNG/JPEG/WebP conversion, and metadata re-encoding stay local', async ({ page }) => {
  await page.goto('/en/tools/image-compress');
  await settleToolAssets(page);
  await assertNoProcessingNetwork(page, async () => {
    await page.locator('input[type=file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('status')).toContainText('1 × 1');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Compress and download' }).click();
    const path = await (await download).path();
    expect(path).toBeTruthy();
    expect((await readFile(path!)).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  });

  await page.goto('/en/tools/image-convert');
  await settleToolAssets(page);
  await assertNoProcessingNetwork(page, async () => {
    await page.locator('input[type=file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('status')).toContainText('1 × 1');
    for (const [format, magic] of [
      ['image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47])],
      ['image/jpeg', Buffer.from([0xff, 0xd8])],
      ['image/webp', Buffer.from('RIFF')],
    ] as const) {
      await page.getByLabel('Output format').selectOption(format);
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Convert and download' }).click();
      const path = await (await download).path();
      expect(path).toBeTruthy();
      expect((await readFile(path!)).subarray(0, magic.length)).toEqual(magic);
    }
  });

  await page.goto('/en/tools/remove-image-metadata');
  await settleToolAssets(page);
  await assertNoProcessingNetwork(page, async () => {
    await page.locator('input[type=file]').setInputFiles({ name: 'tagged.png', mimeType: 'image/png', buffer: pngWithText('PrivateComment') });
    await expect(page.getByRole('status')).toContainText('1 × 1');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Remove metadata and download' }).click();
    const path = await (await download).path();
    expect(path).toBeTruthy();
    const output = await readFile(path!);
    expect(output.includes(Buffer.from('PrivateComment'))).toBe(false);
  });
  await expect(page.getByRole('status')).toContainText('Done');
  await expect(page.locator('.result-list')).toContainText('1 × 1');
});

test('PDF merge, hash, and text transforms stay local', async ({ page }) => {
  const first = await pdfFixture(1);
  const second = await pdfFixture(1);
  await page.goto('/en/tools/pdf-merge');
  await settleToolAssets(page);
  let merged: Buffer | undefined;
  await assertNoProcessingNetwork(page, async () => {
    await page.locator('input[type=file]').setInputFiles([
      { name: 'one.pdf', mimeType: 'application/pdf', buffer: first },
      { name: 'two.pdf', mimeType: 'application/pdf', buffer: second },
    ]);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Merge and download' }).click();
    const path = await (await download).path();
    if (path) merged = await readFile(path);
  });
  await expect(page.getByRole('status')).toContainText('Pages: 2');
  expect(merged).toBeDefined();
  expect((await PDFDocument.load(merged!)).getPageCount()).toBe(2);

  await page.goto('/en/tools/file-hashes');
  await settleToolAssets(page);
  await assertNoProcessingNetwork(page, async () => {
    await page.locator('input[type=file]').setInputFiles({ name: 'hello.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await page.getByRole('button', { name: 'Calculate hashes' }).click();
    await expect(page.getByRole('status')).toContainText('Done');
  });
  await expect(page.locator('dd').first()).toHaveText('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');

  await page.goto('/es/herramientas/json');
  await settleToolAssets(page);
  await assertNoProcessingNetwork(page, async () => {
    await page.getByLabel('Entrada').fill('{"útil":true}');
    await page.getByRole('button', { name: 'Dar formato a JSON' }).click();
    await expect(page.getByRole('status')).toContainText('JSON válido');
  });
  await expect(page.getByLabel('Resultado')).toHaveValue(/"útil": true/);
});

test('PDF extract, rotate, and reorder produce valid local PDFs', async ({ page }) => {
  const source = await pdfFixture(3);
  const cases = [
    { route: 'pdf-extract', field: 'Pages to extract', value: '1,3', count: 2, action: 'Extract and download' },
    { route: 'pdf-rotate', field: '', value: '', count: 3, action: 'Rotate and download' },
    { route: 'pdf-reorder', field: 'New page order', value: '3,1,2', count: 3, action: 'Reorder and download' },
  ];
  for (const item of cases) {
    await page.goto(`/en/tools/${item.route}`);
    await settleToolAssets(page);
    let result: Buffer | undefined;
    await assertNoProcessingNetwork(page, async () => {
      await page.locator('input[type=file]').setInputFiles({ name: 'three.pdf', mimeType: 'application/pdf', buffer: source });
      if (item.field) await page.getByLabel(item.field).fill(item.value);
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: item.action }).click();
      const path = await (await download).path();
      if (path) result = await readFile(path);
    });
    expect(result).toBeDefined();
    const output = await PDFDocument.load(result!);
    expect(output.getPageCount()).toBe(item.count);
    if (item.route === 'pdf-rotate') expect(output.getPage(0).getRotation().angle).toBe(90);
    if (item.route === 'pdf-reorder') expect(output.getPage(0).getWidth()).toBe(202);
  }
});

test('file information and remaining text utilities stay local', async ({ page }) => {
  await page.goto('/en/tools/file-information');
  await settleToolAssets(page);
  await assertNoProcessingNetwork(page, async () => {
    await page.locator('input[type=file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Inspect file' }).click();
    await expect(page.getByRole('status')).toContainText('Done');
  });
  await expect(page.locator('.result-list')).toContainText('pixel.png');
  await expect(page.locator('.result-list')).toContainText('1 × 1');
  await expect(page.locator('.notice')).toContainText('not authoritative');

  await page.goto('/en/tools/base64');
  await settleToolAssets(page);
  await assertNoProcessingNetwork(page, async () => {
    await page.getByLabel('Input').fill('¡Hola!');
    await page.getByRole('button', { name: 'Encode text' }).click();
    await expect(page.getByRole('status')).toContainText('Done');
  });
  await expect(page.getByLabel('Output')).toHaveValue('wqFIb2xhIQ==');
  await assertNoProcessingNetwork(page, async () => {
    await page.getByLabel('Input').fill('%%%');
    await page.getByRole('button', { name: 'Decode text' }).click();
    await expect(page.getByRole('status')).toContainText('not valid Base64');
  });

  await page.goto('/en/tools/url-encoding');
  await settleToolAssets(page);
  await assertNoProcessingNetwork(page, async () => {
    await page.getByLabel('Input').fill('a b/c');
    await page.getByRole('button', { name: 'Apply operation', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Done');
  });
  await expect(page.getByLabel('Output')).toHaveValue('a%20b%2Fc');

  await page.goto('/en/tools/uuid');
  await settleToolAssets(page);
  const output = page.locator('textarea');
  await expect(output).toHaveValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  await assertNoProcessingNetwork(page, async () => {
    await page.getByRole('button', { name: 'Generate 10 UUIDv4 values' }).click();
    await expect(page.getByRole('status')).toContainText('Complete');
  });
  expect((await output.inputValue()).split('\n')).toHaveLength(10);
});

test('JSON minification/download and URL decoding stay local', async ({ page }) => {
  await page.goto('/en/tools/json');
  await settleToolAssets(page);
  const downloadButton = page.getByRole('button', { name: 'Download JSON' });
  const copyButton = page.getByRole('button', { name: 'Copy', exact: true });
  await expect(downloadButton).toBeDisabled();
  await expect(copyButton).toBeDisabled();
  await assertNoProcessingNetwork(page, async () => {
    await page.getByLabel('Input').fill('{"message":"¡Hola!","items":[1,2]}');
    await page.getByRole('button', { name: 'Minify JSON' }).click();
    await expect(page.getByRole('status')).toContainText('Valid JSON');
    await expect(page.getByLabel('Output')).toHaveValue('{"message":"¡Hola!","items":[1,2]}');
    await expect(downloadButton).toBeEnabled();
    await expect(copyButton).toBeEnabled();
    const download = page.waitForEvent('download');
    await downloadButton.click();
    const path = await (await download).path();
    expect(path).toBeTruthy();
    expect(await readFile(path!, 'utf8')).toBe('{"message":"¡Hola!","items":[1,2]}');
    await page.getByLabel('Input').fill('{not valid}');
    await page.getByRole('button', { name: 'Format JSON' }).click();
    await expect(page.getByRole('status')).toContainText('Invalid JSON');
    await expect(downloadButton).toBeDisabled();
    await expect(copyButton).toBeDisabled();
  });

  await page.goto('/en/tools/url-encoding');
  await settleToolAssets(page);
  await assertNoProcessingNetwork(page, async () => {
    await page.getByLabel('Operation').selectOption('component-decode');
    await page.getByLabel('Input').fill('a%20b%2Fc');
    await page.getByRole('button', { name: 'Apply operation', exact: true }).click();
    await expect(page.getByLabel('Output')).toHaveValue('a b/c');

    await page.getByLabel('Operation').selectOption('full-decode');
    await page.getByLabel('Input').fill('https://example.com/a%20path?q=hello%20world');
    await page.getByRole('button', { name: 'Apply operation', exact: true }).click();
    await expect(page.getByLabel('Output')).toHaveValue('https://example.com/a path?q=hello world');
  });
  await expect(page.getByRole('status')).toContainText('Done');
});

test('QR generation and local reading perform no content upload', async ({ page }) => {
  await page.goto('/en/tools/qr-generate');
  await expect(page.getByRole('status')).toContainText('Ready', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  await assertNoProcessingNetwork(page, async () => {
    await page.getByLabel('Text or URL').fill('https://example.com/safe');
    await page.getByRole('button', { name: 'Generate QR code' }).click();
    await expect(page.getByRole('status')).toContainText('Done');
    await expect(page.getByRole('button', { name: 'Download QR code' })).toBeVisible();
  });
  const qrDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download QR code' }).click();
  const qrDownload = await qrDownloadPromise;
  const qrPath = await qrDownload.path();
  if (!qrPath) throw new Error('QR download did not produce a local file');
  const qrBytes = await readFile(qrPath);

  await page.goto('/en/tools/qr-read');
  await expect(page.getByRole('status')).toContainText('Ready', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  await assertNoProcessingNetwork(page, async () => {
    await page.locator('input[type=file]').setInputFiles({ name: 'qr.png', mimeType: 'image/png', buffer: qrBytes });
    await page.getByRole('button', { name: 'Read QR code' }).click();
    await expect(page.getByRole('status')).toContainText('Done');
    await expect(page.locator('.qr-output')).toContainText('https://example.com/safe');
  });
  await expect(page.locator('.qr-output')).toContainText('https://example.com/safe');
});

test('private URL parsing and rejection stay local from input onward', async ({ page }) => {
  await page.route('**/_portal/config', async (route) => route.fulfill({
    json: { publicRedditUrl: 'https://reddit.utility.test/', enabledServices: ['redlib'] },
  }));
  await page.goto('/en/tools/open-privately');
  await settleToolAssets(page);
  await assertNoProcessingNetwork(page, async () => {
    await page.getByLabel('Supported public URL').fill('https://youtube.com.evil.example/watch?v=test');
    await page.getByRole('button', { name: 'Check URL' }).click();
    await expect(page.getByRole('status')).toContainText('not from a supported');
  });
  await expect(page.locator('.router-result a')).toHaveCount(0);

  await assertNoProcessingNetwork(page, async () => {
    await page.getByLabel('Supported public URL').fill('https://old.reddit.com/r/privacy?sort=top&redirect=https://evil.example');
    await page.getByRole('button', { name: 'Check URL' }).click();
    await expect(page.getByRole('status')).toContainText('Destination recognized');
  });
  await expect(page.locator('.router-result a')).toHaveAttribute('href', 'https://reddit.utility.test/r/privacy?sort=top');
});

async function pdfFixture(pageCount: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) pdf.addPage([200 + index, 300 + index]);
  return Buffer.from(await pdf.save());
}

function pngWithText(value: string): Buffer {
  const data = Buffer.from(`Comment\0${value}`);
  const type = Buffer.from('tEXt');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  const chunk = Buffer.concat([length, type, data, crc]);
  return Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
