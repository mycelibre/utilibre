import { parseHTML } from 'linkedom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PublicConfig } from '../../src/config';
import { renderProblemReport } from '../../src/components/problem-report';

const defaultConfig = { enabledServices: [], listedServices: [], contactUrl: '', publicFormsUrl: '' } as unknown as PublicConfig;

beforeEach(() => vi.stubGlobal('document', parseHTML('<html><body></body></html>').document));
afterEach(() => vi.unstubAllGlobals());

it('opens the configured guest feedback form without forwarding private state', () => {
  vi.stubGlobal('location', { href: 'https://utilibre.example/es/?private=document#secret' });
  for (const language of ['en', 'es'] as const) {
    const report = renderProblemReport(language, { ...defaultConfig, enabledServices: ['liberaforms'], publicFormsUrl: 'https://forms.example/', contactUrl: 'https://github.com/example/issues' })!;
    const a = report.querySelector('a')!;
    expect(a.href).toBe('https://forms.example/feedback');
    expect(a.target).toBe('_blank');
    expect(a.rel).toContain('noreferrer');
    expect(report.querySelector('form, input, textarea, script')).toBeNull();
    expect(report.textContent).not.toContain('secret');
  }
});

it('does not send people to a disabled form or label a public contact as private', () => {
  const report = renderProblemReport('en', { ...defaultConfig, enabledServices: [], publicFormsUrl: 'https://forms.example/', contactUrl: 'https://github.com/example/issues' })!;
  expect(report.querySelector('a')!.href).toBe('https://github.com/example/issues');
  expect(report.textContent).toContain('may be public');
  expect(report.querySelector('a')!.textContent).not.toContain('privately');
  expect(renderProblemReport('es', { ...defaultConfig, contactUrl: '', publicFormsUrl: '' })).toBeNull();
});
