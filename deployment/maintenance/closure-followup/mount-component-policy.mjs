// Only the two later owner/idmap-hook defects, never the older target race.
export function bookwormHookCase(item) {
 return item.type==='debian'&&item.scope==='runtime-image'&&
  item.installed==='2.38.1-5+deb12u3'&&['libmount1','mount'].includes(item.package)&&
  ['CVE-2026-76642','CVE-2026-78410'].includes(item.id);
}
