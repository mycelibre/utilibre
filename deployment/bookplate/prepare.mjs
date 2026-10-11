// Small reproducible privacy-only changes to the pinned upstream application.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const source=process.argv[2]||'/opt/utilibre/evaluation-src/bookplate-20261011';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!=='47e53a7aec56aa9e76d4cf425deb48102e4a2fd7')throw Error('Unexpected Bookplate source');
const upstream=p=>execFileSync('git',['show','HEAD:'+p],{cwd:source,encoding:'utf8'});
// Keep the selected application; patch Next's upstream image/RSC security fixes.
// The checked-in override lock freezes the reviewed transitive resolution.
const manifest=JSON.parse(upstream('package.json'));
manifest.dependencies.next='16.3.6';
manifest.devDependencies['eslint-config-next']='16.3.6';
writeFileSync(source+'/package.json',JSON.stringify(manifest,null,2)+'\n');
const lockPath=new URL('./security-package-lock.json',import.meta.url);
writeFileSync(source+'/package-lock.json',readFileSync(lockPath));
const reporter=upstream('components/ErrorReporter.tsx');
if(!reporter.includes('fetch("/api/client-errors"'))throw Error('Reporter changed; review required');
writeFileSync(source+'/components/ErrorReporter.tsx',`"use client";
// Utilibre: error boundaries still work, but no browser diagnostics are sent.
export function reportError(kind: string, error: unknown, digest?: string) {
  void kind; void error; void digest;
}
export default function ErrorReporter() { return null; }
`);
const settings=upstream('components/SettingsPanel.tsx');
if(!settings.includes('<Showcase years={showcaseYears} />'))throw Error('Showcase integration changed');
writeFileSync(source+'/components/SettingsPanel.tsx',settings.replace('<Showcase years={showcaseYears} />','<p>Public library sharing is unavailable on this instance. Your library stays behind your account.</p>'));
const df=upstream('Dockerfile').replaceAll('FROM node:24-alpine','FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1').replace('RUN npm ci','RUN npm ci --no-audit --no-fund').replace('ENV NEXT_TELEMETRY_DISABLED=1','ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=2048');
writeFileSync(source+'/Dockerfile',df);
console.log('Bookplate: remote browser-error reporting removed; public sharing control replaced with an access note; Node image pinned.');
