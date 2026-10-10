// Public-edge check. Creates and removes exactly one disposable native game.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

const base = 'https://chess.utilibre.org';
const reportDir = '/opt/utilibre/reports/family-chess-public-20261009';
await mkdir(reportDir, { recursive: true, mode: 0o700 });
const report = { checkedAt: new Date().toISOString(), publicEdge: true, checks: [], errors: [], externalHosts: [] };
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const pages = [];
let game = '';
async function participant(locale, width) {
  const context = await browser.newContext({ locale, viewport: { width, height: 850 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('request', r => {
    if (new URL(r.url()).hostname !== 'chess.utilibre.org') report.externalHosts.push(new URL(r.url()).hostname);
  });
  pages.push(page);
  return page;
}
async function move(page, from, to) {
  await page.bringToFront();
  // Upstream explicitly disables dragging and implements square-click movement.
  await page.locator(`#board [data-square="${from}"]`).click();
  await page.locator(`#board [data-square="${to}"]`).click();
}
try {
  const white = await participant('en-US', 1280);
  const black = await participant('es-ES', 390);
  for (const [index, page] of [white, black].entries()) {
    const response = await page.goto(base + '/');
    assert.equal(response.status(), 200);
    assert((await response.allHeaders())['x-robots-tag'].includes('noindex'));
    await page.locator('form[action="/new/"] button').waitFor();
    if (index) assert((await page.innerText('body')).includes('Crear'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${reportDir}/home-${index}.png`, fullPage: true });
  }
  report.checks.push('Public EN1280/ES390 landing, intended noindex, local assets and no horizontal overflow');
  await white.locator('form[action="/new/"] button').click();
  await white.waitForURL(/\/\d{8}\/$/);
  game = new URL(white.url()).pathname.split('/')[1];
  await white.locator('#chooseWhite').click();
  await white.locator('#readyBtn').click();
  await black.goto(white.url());
  await black.locator('#chooseBlack').click();
  await black.locator('#readyBtn').click();
  await white.waitForFunction(() => typeof gameStarted !== 'undefined' && gameStarted);
  const spectator = await participant('en-US', 1100);
  await spectator.goto(white.url());
  await spectator.locator('#spectatorMode').waitFor();
  await white.waitForTimeout(700);
  await move(white, 'e2', 'e4');
  await white.waitForTimeout(1000);
  await white.screenshot({ path: `${reportDir}/after-first-move.png`, fullPage: true });
  report.firstMove = await white.evaluate(async () => {
    const state = await (await fetch(location.pathname + 'state/')).json();
    return { displayedPawn: board.position().e4, nativeMove: state.last_move, playerColor, isSpectator, gameStarted };
  });
  await black.waitForFunction(() => board.position().e4 === 'wP');
  await spectator.waitForFunction(() => board.position().e4 === 'wP');
  await move(black, 'e7', 'e5');
  await white.waitForFunction(() => board.position().e5 === 'bP');
  await spectator.waitForFunction(() => board.position().e5 === 'bP');
  const rejected = await spectator.evaluate(async () => {
    const csrf = document.cookie.split('; ').find(s => s.startsWith('csrftoken=')).split('=')[1];
    const response = await fetch(location.pathname + 'move/', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
      body: JSON.stringify({ from: 'd2', to: 'd4' }),
    });
    return (await response.json()).status;
  });
  assert.equal(rejected, 'error');
  const liveSources = await Promise.all(pages.map(p => p.evaluate(() => typeof evtSource !== 'undefined' && evtSource?.readyState === 1)));
  assert(liveSources.some(Boolean), 'No public native SSE stream opened');
  assert.equal(await black.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await black.screenshot({ path: `${reportDir}/game-es390.png`, fullPage: true });
  await white.screenshot({ path: `${reportDir}/game-en1280.png`, fullPage: true });
  report.checks.push('Two native player seats, two legal square-click moves, live updates in other player and spectator, spectator write denied, public SSE open');
  assert.deepEqual(report.errors, []);
  assert.deepEqual([...new Set(report.externalHosts)], []);
  report.passed = true;
} finally {
  await browser.close();
  if (/^\d{8}$/.test(game)) {
    const code = `from game.models import Game; q=Game.objects.filter(game_id='${game}'); assert q.count()==1; q.delete(); assert not Game.objects.filter(game_id='${game}').exists()`;
    execFileSync('docker', ['compose', '-f', '/home/ubuntu/freetools/deployment/family-chess/compose.yaml', 'exec', '-T', 'app', 'python', 'manage.py', 'shell', '-c', code], { stdio: 'pipe' });
    report.disposableGameRemoved = true;
  }
  await writeFile(`${reportDir}/public-check.json`, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report));
}
