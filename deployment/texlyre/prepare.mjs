// Reproducible, narrow packaging changes to pinned TeXlyre 0.13.0.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const source = resolve(process.argv[2] || '/opt/utilibre/evaluation-src/texlyre-20261011');
const integration = dirname(fileURLToPath(import.meta.url));
const revision = '0b5ebfd3dbcd2d3647dc777e8de9cbe0692b7950';
if (execFileSync('git', ['rev-parse','HEAD'], {cwd:source,encoding:'utf8'}).trim() !== revision) throw Error('Unexpected source');
const upstream = path => execFileSync('git',['show',`HEAD:${path}`],{cwd:source,encoding:'utf8'});
const patch = (path, from, to) => {
  const input = upstream(path);
  if (!input.includes(from)) throw Error(`Upstream changed: ${path}`);
  writeFileSync(join(source,path), input.replace(from,to));
};
writeFileSync(join(source,'texlyre.upstream.config.ts'),upstream('texlyre.config.ts'));
copyFileSync(join(integration,'instance-config.ts'),join(source,'texlyre.config.ts'));
copyFileSync(join(integration,'PrivacyModal.tsx'),join(source,'src/components/common/PrivacyModal.tsx'));
patch('src/components/common/FooterLinks.tsx', "href='https://github.com/TeXlyre/texlyre'", "href='/utilibre-source/texlyre-utilibre.tar.gz'");
patch('src/components/auth/GuestConsentModal.tsx', "<li>{t('Collaborate in real-time')}</li>", '<li>Remote collaboration is unavailable at Utilibre.</li>');
const guestPath = join(source,'src/components/auth/GuestConsentModal.tsx');
writeFileSync(guestPath,readFileSync(guestPath,'utf8')
  .replace("t('Anonymous collaboration:')", "t('Local identity:')")
  .replace("t('You appear as \"Guest User\" to others')", "t('Guest User is saved in this browser')"));
// Unused diagram embeds are not downloaded or served. Keep the upstream asset
// downloader for the pinned compiler bundles, formatter, grammar and fonts.
patch('scripts/download-core-assets.cjs','for (const asset of ASSETS) {',"for (const asset of ASSETS.filter(asset => !['drawio-embed', 'tikz-editor'].includes(asset.name))) {");
// SwiftLaTeX needs a separate TeX Live 2020 package server. Do not offer it as a
// working engine here. BusyTeX's native bundled TeX Live 2026 remains available.
patch('src/settings/registerLatexSettings.ts',
  "\t\t\t\t{ label: t('pdfTeX (SwiftLaTeX / TeX Live 2020)'), value: 'pdftex' },\n\t\t\t\t{ label: t('XeTeX (SwiftLaTeX / TeX Live 2020)'), value: 'xetex' },\n", '');
for (const name of ['LaTeXCompileButton', 'LaTeXExportButton']) {
  const path = `src/components/output/${name}.tsx`;
  const input = upstream(path);
  const changed = input.replace(/const SWIFT_ENGINES:[\s\S]*?\n\];\n/, '')
    .replace(/\s*<optgroup label=\{t\('SwiftLaTeX \(TeX Live 2020\)'\)\}>[\s\S]*?<\/optgroup>/, '');
  if (changed === input || changed.includes('SWIFT_ENGINES')) throw Error(`Engine UI changed: ${path}`);
  writeFileSync(join(source,path),changed);
}
const pkg = JSON.parse(upstream('package.json'));
Object.assign(pkg.overrides, {
  dompurify: '3.4.16', vue: '3.5.43', 'prosemirror-view': '1.42.6',
  'source-map-js': '1.2.2', 'micromark-extension-math': {katex:'0.18.4'},
});
writeFileSync(join(source,'package.json'),JSON.stringify(pkg,null,2)+'\n');
console.log('Prepared pinned source; regenerate lock on a reviewed update, otherwise use the committed lock.');
