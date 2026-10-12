import {execFileSync} from 'node:child_process';
export const command = (name, args, options = {}) => execFileSync(name, args, {
  encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe'], ...options,
}).trim();

// Outputs only package-owned paths, file digests/types and link targets. Never
// reads configuration values into the report, and never follows link contents.
const inventoryScript = `set -eu
dpkg-query -L "$1" | LC_ALL=C sort | while IFS= read -r p; do
  if [ -L "$p" ]; then
    printf 'symlink|%s|%s\\n' "$p" "$(readlink -- "$p")"
  elif [ -d "$p" ]; then
    printf 'directory|%s\\n' "$p"
  elif [ -f "$p" ]; then
    digest=$(sha256sum -- "$p"); digest=\${digest%% *}
    magic=$(head -c 4 -- "$p" | od -An -tx1 | tr -d ' \\n')
    printf 'regular|%s|%s|%s\\n' "$p" "$digest" "$magic"
  elif [ ! -e "$p" ]; then
    printf 'missing|%s\\n' "$p"
  else
    printf 'unknown|%s\\n' "$p"
  fi
done`;

export function inventory(packageName, container) {
  if (!/^[a-z0-9][a-z0-9+.-]*$/.test(packageName)) throw new Error('Unexpected package name');
  const invoke = (exe, args) => container ? command('docker', ['exec', container, exe, ...args]) : command(exe, args);
  const installed = invoke('dpkg-query', ['-W', '-f=${Version}', packageName]);
  const raw = invoke('sh', ['-c', inventoryScript, 'component-inventory', packageName]);
  const records = raw.split('\n').map(row => {
    const [type, path, value, magic] = row.split('|');
    return type === 'regular' ? {type, path, sha256: value, magic} : type === 'symlink' ? {type, path, target: value} : {type, path};
  });
  return {package: packageName, installed, records};
}
