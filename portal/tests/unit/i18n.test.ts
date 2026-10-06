import { describe, expect, it } from 'vitest';
import { catalog } from '../../src/catalog/catalog';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

describe('bilingual content', () => {
  it('uses Guatemalan voseo in Utilibre-owned Spanish copy', () => {
    expect(es['home.title']).toContain('necesitás');
    expect(es['home.catalog.empty']).toContain('Borrá');
    expect(catalog.find((entry) => entry.id === 'freshrss')?.help?.es).toContain('tenés');
    const spanish = [...Object.values(es), ...catalog.map((entry) => `${entry.description.es} ${entry.help?.es ?? ''}`)].join(' ');
    expect(spanish).not.toMatch(/\b(tienes|puedes|necesitas|quieres|haz|elige|navega)\b/i);
  });
  it('has exactly the same stable keys in English and Spanish', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(es).every((value) => value.trim().length > 0)).toBe(true);
  });

  it('credits upstream developers and invites direct support in both languages', () => {
    expect(en['support.upstream.body']).toContain('hosts and integrates');
    expect(en['support.upstream.body']).toContain('Most of the work');
    expect(en['support.upstream.body']).toContain('supporting those projects directly');
    expect(es['support.upstream.body']).toContain('aloja e integra');
    expect(es['support.upstream.body']).toContain('La mayor parte del trabajo');
    expect(es['support.upstream.body']).toContain('apoyar también directamente a esos proyectos');
  });

  it('labels the repository license and third-party notices clearly in both languages', () => {
    expect(en['software.documents.license']).toContain('LICENSE');
    expect(en['software.documents.notices']).toContain('THIRD_PARTY_NOTICES');
    expect(es['software.documents.license']).toContain('LICENSE');
    expect(es['software.documents.notices']).toContain('THIRD_PARTY_NOTICES');
  });

  it('explains the public data path without exposing operator release instructions', () => {
    const english = en['privacy.portal.body'];
    const spanish = es['privacy.portal.body'];
    expect(english).toContain('Cloudflare');
    expect(english).toContain('network address and request headers');
    expect(english).toContain('Search uses a direct HTTPS connection');
    expect(english).not.toContain('should be checked before each release');
    expect(spanish).toContain('Cloudflare');
    expect(spanish).toContain('dirección de red');
    expect(spanish).not.toContain('Se debe comprobar');
  });

  it('discloses AI-assisted development without claiming an independent audit', () => {
    expect(en['transparency.development.body']).toContain('OpenAI Codex');
    expect(en['transparency.development.body']).toContain('no independent human code or security audit is claimed');
    expect(es['transparency.development.body']).toContain('OpenAI Codex');
    expect(es['transparency.development.body']).toContain('no se afirma que haya existido una auditoría independiente');
  });

  it('gives every catalog entry complete bilingual privacy fields', () => {
    for (const entry of catalog) {
      expect(entry.id).toMatch(/^[a-z0-9-]+$/);
      expect(entry.name.en.length).toBeGreaterThan(1);
      expect(entry.name.es.length).toBeGreaterThan(1);
      expect(entry.description.en.length).toBeGreaterThan(10);
      expect(entry.description.es.length).toBeGreaterThan(10);
      expect(entry.dataFlow.en.length).toBeGreaterThan(10);
      expect(entry.dataFlow.es.length).toBeGreaterThan(10);
      expect(entry.labels.length).toBeGreaterThan(0);
      expect(entry.license.length).toBeGreaterThan(1);
      if (entry.upstreamSourceUrl) expect(entry.upstreamProject.length).toBeGreaterThan(1);
      if (entry.upstreamProject) expect(entry.upstreamSourceUrl).toMatch(/^https:\/\//);
    }
  });

  it('ties every public entry to an independently maintained upstream application', () => {
    for (const entry of catalog) {
      expect(entry.providerId.length).toBeGreaterThan(1);
      expect(entry.upstreamProject.length).toBeGreaterThan(1);
      expect(entry.upstreamSourceUrl).toMatch(/^https:\/\//);
      expect(entry.implementation).toMatch(/^(upstream-application|integration-glue)$/);
    }
  });

  it('marks only the verified account-backed services with their public access mode', () => {
    const accountAccess = Object.fromEntries(catalog
      .filter((entry) => entry.accountAccess)
      .map((entry) => [entry.id, entry.accountAccess]));

    expect(accountAccess).toEqual({
      freshrss: 'closed-registration',
      'reactive-resume': 'invite-required',
      penpot: 'invite-required',
      actual: 'invite-required',
      rallly: 'closed-registration',
      wakapi: 'invite-required',
    });
  });

  it('discloses the local parsing and later proxy navigation of the private router', () => {
    const router = catalog.find((entry) => entry.id === 'private-router');
    expect(router?.labels).toEqual(['local', 'server', 'proxy']);
    expect(router?.filesUploaded).toBe(false);
  });

  it('describes Redlib as a proxied service with honest operational limits', () => {
    const redlib = catalog.find((entry) => entry.id === 'redlib');
    expect(redlib?.labels).toEqual(['server', 'proxy']);
    expect(redlib?.operationalStatus).toBe('operational');
    expect(redlib?.filesUploaded).toBe(false);
    expect(redlib?.dataFlow.en).toContain('Redlib → Reddit');
    expect(redlib?.retention.en).toContain('first-party cookie');
    expect(redlib?.installedVersion).toContain('a4d36e9');
  });

});
