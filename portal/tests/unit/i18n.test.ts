import { describe, expect, it } from 'vitest';
import { catalog } from '../../src/catalog/catalog';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

describe('bilingual content', () => {
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

  it('discloses Cloudflare while recording NEL as disabled in both languages', () => {
    const english = en['privacy.portal.body'];
    const spanish = es['privacy.portal.body'];
    expect(english).toContain('Cloudflare remains an external processor');
    expect(english).toContain('disabled on September 3, 2026');
    expect(english).toContain('neither NEL nor Report-To');
    expect(english).toContain('should be checked before each release');
    expect(spanish).toContain('Cloudflare sigue siendo un procesador externo');
    expect(spanish).toContain('se desactivó el 3 de septiembre de 2026');
    expect(spanish).toContain('no contenían NEL ni Report-To');
    expect(spanish).toContain('Se debe comprobar');
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
      healthchecks: 'closed-registration',
      freshrss: 'closed-registration',
      wakapi: 'invite-required',
    });
    expect(catalog.find((entry) => entry.id === 'ntfy')?.accountAccess).toBeUndefined();
  });

  it('marks the locally adjusted BentoPDF and RSSHub deployments as modified', () => {
    expect(catalog.find((entry) => entry.id === 'bentopdf')?.modified).toBe(true);
    expect(catalog.find((entry) => entry.id === 'rsshub')?.modified).toBe(true);
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

  it('states ntfy retention and supported iOS relay metadata in both languages', () => {
    const ntfy = catalog.find((entry) => entry.id === 'ntfy');
    expect(ntfy?.operationalStatus).toBe('operational');
    expect(ntfy?.dataFlow.en).toContain('Cloudflare');
    expect(ntfy?.dataFlow.en).toContain('message ID');
    expect(ntfy?.dataFlow.en).toContain('SHA-256');
    expect(ntfy?.dataFlow.en).toContain('does not send the message body or attachment');
    expect(ntfy?.retention.en).toContain('12 hours');
    expect(ntfy?.retention.en).toContain('three hours');
    expect(ntfy?.dataFlow.es).toContain('Cloudflare');
    expect(ntfy?.dataFlow.es).toContain('identificador del mensaje');
    expect(ntfy?.dataFlow.es).toContain('SHA-256');
    expect(ntfy?.dataFlow.es).toContain('no envía el cuerpo del mensaje ni el archivo adjunto');
    expect(ntfy?.retention.es).toContain('12 horas');
    expect(ntfy?.retention.es).toContain('tres horas');
  });

  it('discloses Healthchecks mail delivery in both languages', () => {
    const healthchecks = catalog.find((entry) => entry.id === 'healthchecks');
    expect(healthchecks?.labels).toEqual(['server', 'proxy']);
    expect(healthchecks?.upstreamServices).toContain('Configured SMTP relay and recipient mail providers');
    expect(healthchecks?.dataFlow.en).toContain('recipient’s mail provider');
    expect(healthchecks?.dataFlow.es).toContain('proveedor de correo');
    expect(healthchecks?.logging.en).toContain('Outgoing mail uses');
    expect(healthchecks?.logging.es).toContain('El correo saliente usa');
  });
});
