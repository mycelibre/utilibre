// Named, frozen inputs only; this switch does not authorize activation.
export const current = process.argv.includes('--oct22');
export const profile = current ? {
  dir: '/var/lib/utilibre-maintenance/security-20261022/bookplate',
  base: 'sha256:0908961ffa20ca6d4f0522200809c88a779ca6a540a110d298f8a0d2e500633c',
  next: '16.4.1', image: 'utilibre-bookplate:1.1.0-next1641-security-20261022',
} : {
  dir: '/var/lib/utilibre-maintenance/next-leaves-final-20261012',
  base: 'sha256:9994dbe98020f667b88880041455efcd4e5cb08786427a8b7682f205869779af',
  next: '16.3.8', image: 'utilibre-bookplate:1.1.0-next1638-security-20261012',
};
