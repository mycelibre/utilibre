// Operator-configured probes only. Public checks are restricted to these exact
// application roots; never accept arbitrary Internet destinations or redirects.
const publicRoots = new Map([
  ['zip-manager', 'https://zip.utilibre.org/'],
  ['rawgraphs', 'https://charts.utilibre.org/'],
  ['audiomass', 'https://audio.utilibre.org/'],
  ['minipaint', 'https://paint.utilibre.org/'],
  ['excalidraw', 'https://whiteboard.utilibre.org/'],
  ['svgedit', 'https://svg.utilibre.org/'],
  ['cyberchef', 'https://cyberchef.utilibre.org/'],
  ['image-scrubber', 'https://scrub.utilibre.org/'],
  ['markmap', 'https://mindmap.utilibre.org/'],
]);

export function parseStatusServices(value, privateBindIp) {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean).flatMap((entry) => {
    const separator = entry.indexOf('=');
    if (separator < 1) return [];
    const id = entry.slice(0, separator).trim();
    try {
      const url = new URL(entry.slice(separator + 1).trim());
      if (!/^[a-z0-9-]+$/i.test(id) || url.hash || url.username || url.password) return [];
      const targetIsInternalName = /^[a-z0-9-]+$/i.test(url.hostname);
      const normalizedHost = url.hostname.replace(/^::ffff:/, '').replace(/^\[|\]$/g, '');
      const targetIsPrivateBind = privateBindIp && normalizedHost === privateBindIp;
      const privateHttpTarget = url.protocol === 'http:' && (targetIsInternalName || targetIsPrivateBind);
      const publicHttpsTarget = publicRoots.get(id) === url.href;
      if (!privateHttpTarget && !publicHttpsTarget) return [];
      return [{ id, url, require2xx: publicHttpsTarget }];
    } catch { return []; }
  });
}
