import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { loadValidatedEnvironment } from './validate-config.mjs';

const repository = new URL('../', import.meta.url);
const templateFile = new URL('config/searxng/limiter.toml.template', repository);
const outputFile = new URL('config/searxng/limiter.toml', repository);
const values = await loadValidatedEnvironment();
const edgeIp = values.EDGE_PROXY_IP ?? '';

const template = await readFile(templateFile, 'utf8');
await mkdir(new URL('config/searxng/', repository), { recursive: true });
const edgeEntry = edgeIp ? `  '${edgeIp}',` : '';
await writeFile(outputFile, template.replace("  '__EDGE_PROXY_IP__',", edgeEntry), { mode: 0o644 });
process.stdout.write(edgeIp
  ? 'Rendered config/searxng/limiter.toml with the exact trusted edge address.\n'
  : 'Rendered config/searxng/limiter.toml without an edge proxy trust entry for private preview.\n');
