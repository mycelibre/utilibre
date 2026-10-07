import { defineConfig } from 'vite';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default defineConfig({
  publicDir: false,
  plugins: [{
    name: 'server-renderer-license-notices',
    generateBundle() {
      const packages = new Map<string, string>();
      for (const id of this.getModuleIds()) {
        if (!id.includes('/node_modules/')) continue;
        let directory = dirname(id.split('?')[0]!);
        while (directory.includes('/node_modules')) {
          const manifestPath = join(directory, 'package.json');
          if (existsSync(manifestPath)) {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string; version?: string; license?: string };
            if (manifest.name) {
              const licenses = readdirSync(directory).filter((name) => /^(licen[sc]e|copying|notice)(\.|$)/i.test(name));
              if (!licenses.length) throw new Error(`Missing bundled license: ${manifest.name}`);
              packages.set(manifest.name, `${manifest.name}@${manifest.version} (${manifest.license})\n\n${licenses.map((name) => readFileSync(join(directory, name), 'utf8')).join('\n')}`);
              break;
            }
          }
          directory = dirname(directory);
        }
      }
      const source = [...packages].sort(([a], [b]) => a.localeCompare(b)).map(([, notice]) => notice).join('\n\n---\n\n') + '\n';
      this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_NOTICES.txt', source });
      writeFileSync(new URL('./dist/legal/server-renderer-notices.txt', import.meta.url), source);
    },
  }],
  ssr: { noExternal: true },
  build: {
    ssr: 'src/server-render.ts',
    outDir: 'server-built',
    target: 'node24',
    sourcemap: false,
    rollupOptions: { output: { entryFileNames: 'render.mjs' } },
  },
});
