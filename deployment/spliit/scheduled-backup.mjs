import { execFileSync } from 'node:child_process';
const snapshot = execFileSync(process.execPath, [new URL('./backup.mjs', import.meta.url).pathname], { encoding: 'utf8' }).trim();
execFileSync(process.execPath, [new URL('./verify-backup.mjs', import.meta.url).pathname, snapshot], { stdio: 'inherit' });
