import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium} = createRequire(new URL('../../../portal/package.json', import.meta.url))('playwright-core');
const report = process.argv[2];
const fixture = JSON.parse(await readFile(`${report}/fixture.json`, 'utf8'));
assert.deepEqual(fixture.users, ['fixturea', 'fixtureb', 'fixturec']);
const origin = 'http://127.0.0.1:8080';
const browser = await chromium.launch();
const external = [];
async function login(username) {
  const context = await browser.newContext({acceptDownloads: true});
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin !== origin) {
      external.push(new URL(route.request().url()).hostname);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto(`${origin}/i/?c=auth&a=login`);
  await page.locator('input[name="username"]').fill(username);
  await page.locator('#passwordPlain').fill(fixture.password);
  await Promise.all([page.waitForURL(url => url.searchParams.get('a') !== 'login'), page.locator('form button[type="submit"]').click()]);
  return {context, page};
}
async function exportSelection(page, {starred, labelled, feed}, filename) {
  await page.goto(`${origin}/i/?c=importExport`);
  await page.locator('#export_opml').uncheck();
  await page.locator('#export_starred').setChecked(starred);
  await page.locator('#export_labelled').setChecked(labelled);
  await page.locator('select[name="export_feeds[]"]').selectOption(feed ? [String(fixture.feedId)] : []);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('form[action*="a=export"] button[type="submit"]').click();
  const download = await downloadPromise;
  await download.saveAs(`${report}/${filename}`);
}
try {
  const source = await login('fixturea');
  await exportSelection(source.page, {starred:false, labelled:false, feed:true}, 'selected-feed.json');
  await exportSelection(source.page, {starred:true, labelled:true, feed:false}, 'starred-labelled.json');
  await exportSelection(source.page, {starred:true, labelled:true, feed:true}, 'selected-articles.zip');
  assert.equal(JSON.parse(await readFile(`${report}/selected-feed.json`, 'utf8')).items.length, 50);
  assert.equal(JSON.parse(await readFile(`${report}/starred-labelled.json`, 'utf8')).items.length, 5);
  await source.page.screenshot({path:`${report}/native-export.png`, fullPage:true});
  await source.context.close();
  for (const [username, filename] of [['fixtureb','selected-feed.json'], ['fixturec','selected-articles.zip']]) {
    const {context, page} = await login(username);
    await page.goto(`${origin}/i/?c=importExport`);
    await page.locator('input[type="file"][name="file"]').setInputFiles(`${report}/${filename}`);
    await Promise.all([page.waitForURL(url => url.searchParams.get('c') !== 'importExport'),
      page.locator('form[action*="a=import"] button[type="submit"]').click()]);
    await page.goto(`${origin}/i/?state=3`);
    await page.getByText('Fictional article 50', {exact:true}).first().waitFor();
    if (username === 'fixturec') {
      await page.goto(`${origin}/i/?state=3&search=${encodeURIComponent('intitle:"Fictional article 52"')}`);
      await page.getByText('Fictional article 52', {exact:true}).first().waitFor();
    }
    await page.screenshot({path:`${report}/${username}-imported.png`, fullPage:true});
    await context.close();
  }
  assert.deepEqual(external, [], 'Fictional workflow must not contact outside hosts');
  await writeFile(`${report}/browser.json`, JSON.stringify({passed:true,
    checks:['native login','native selected-feed JSON download','native favourite/labelled JSON download',
      'native article ZIP download','two independent account imports','imported article UI'], external}, null, 2) + '\n');
} finally {
  await browser.close();
}
