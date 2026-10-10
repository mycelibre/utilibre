// Operator-configured probes only. Public checks are restricted to these exact
// application URLs; never accept arbitrary Internet destinations or redirects.
const publicRoots = new Map([
  ['family-chess', 'https://chess.utilibre.org/'],
  ['donetick', 'https://chores.utilibre.org/'],
  ['beaverhabits', 'https://habits.utilibre.org/login'],
  ['projects', 'https://projects.utilibre.org/'],
  ['trip', 'https://trip.utilibre.org/'],
  ['kokoro-web', 'https://tools.utilibre.org/apps/kokoro-web/'],
  ['knit', 'https://tools.utilibre.org/apps/knit/'],
  ['newton', 'https://tools.utilibre.org/apps/newton/'],

  ['rustpad', 'https://tools.utilibre.org/apps/rustpad/'],
  ['autoredact', 'https://tools.utilibre.org/apps/autoredact/'],
  ['gravity', 'https://tools.utilibre.org/apps/gravity/'],

  ['one-file-core', 'https://tools.utilibre.org/apps/one-file-core/'],
  ['tiddlywiki', 'https://tools.utilibre.org/apps/tiddlywiki/'],
  ['moocup', 'https://tools.utilibre.org/apps/moocup/'],

  ['newsletters', 'https://newsletters.utilibre.org/'],
  ['addy', 'https://aliases.utilibre.org/login'],
  ['link-cleaner', 'https://tools.utilibre.org/apps/link-cleaner/'],
  ['moodist', 'https://tools.utilibre.org/apps/moodist/'],
  ['sketchforge', 'https://tools.utilibre.org/apps/sketchforge/'],
  ['chartdb', 'https://tools.utilibre.org/apps/chartdb/'],

  ['drawdb', 'https://tools.utilibre.org/apps/drawdb/'],
  ['bookbinder', 'https://tools.utilibre.org/apps/bookbinder/'],
  ['zip-manager', 'https://zip.utilibre.org/'],
  ['rawgraphs', 'https://charts.utilibre.org/'],
  ['audiomass', 'https://audio.utilibre.org/'],
  ['minipaint', 'https://paint.utilibre.org/'],
  ['excalidraw', 'https://whiteboard.utilibre.org/'],
  ['svgedit', 'https://svg.utilibre.org/'],
  ['cyberchef', 'https://cyberchef.utilibre.org/'],
  ['image-scrubber', 'https://scrub.utilibre.org/'],
  ['markmap', 'https://mindmap.utilibre.org/'],
  ['wbo', 'https://collab.utilibre.org/'],
  ['mapshaper', 'https://maps.utilibre.org/'],
  ['numbat', 'https://calc.utilibre.org/'],
  ['super-productivity', 'https://plan.utilibre.org/'],
]);

export function parseStatusServices(value, privateBindIp) {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean).flatMap((entry) => {
    const separator = entry.indexOf('=');
    if (separator < 1) return [];
    const id = entry.slice(0, separator).trim();
    try {
      const url = new URL(entry.slice(separator + 1).trim());
      if (!/^[a-z0-9-]+$/i.test(id) || url.hash || url.username || url.password) return [];
      // Mumble has no HTTP health endpoint and public UDP pings are disabled.
      // Read only its existing native Kuma observation through this fixed API.
      if (id === 'mumble' && (!privateBindIp || url.href !== `http://${privateBindIp}:3125/api/status-page/heartbeat/utilibre`)) return [];
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

export function mumbleStatusFromKuma(page, heartbeat, now = Date.now()) {
  const unknown = { status: 'unknown', check: 'tcp-listener' };
  if (!Array.isArray(page?.publicGroupList)) return unknown;
  const monitors = page.publicGroupList.flatMap(group => Array.isArray(group?.monitorList) ? group.monitorList : [])
    .filter(monitor => monitor?.name === 'Mumble · private TCP listener' && monitor.type === 'port');
  if (monitors.length !== 1 || !Number.isInteger(monitors[0].id) || monitors[0].id < 1) return unknown;
  const history = heartbeat?.heartbeatList?.[monitors[0].id];
  const latest = Array.isArray(history) ? history.at(-1) : null;
  if (!latest || typeof latest.time !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{3})?$/.test(latest.time)) return unknown;
  // Installed Kuma writes R.isoDateTimeMillis(dayjs.utc()) and exposes it
  // unchanged. Never interpret its zone-less SQL timestamp in the portal TZ.
  const iso = latest.time.replace(' ', 'T') + (latest.time.includes('.') ? 'Z' : '.000Z');
  const checkedAt = Date.parse(iso);
  if (!Number.isFinite(checkedAt) || new Date(checkedAt).toISOString() !== iso
    || checkedAt > now || now - checkedAt > 10 * 60 * 1000) return unknown;
  const states = ['unavailable', 'operational', 'degraded', 'maintenance'];
  if (!Number.isInteger(latest.status) || !states[latest.status]) return unknown;
  return { status: states[latest.status], check: 'tcp-listener', checkedAt: iso };
}
