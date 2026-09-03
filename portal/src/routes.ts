import { catalog } from './catalog/catalog.ts';
import type { Language } from './i18n/index.ts';

export type StaticPage = 'home' | 'services' | 'tools' | 'about' | 'transparency' | 'privacy' | 'acceptable' | 'support' | 'status' | 'software' | 'labels' | 'not-found';
export interface Route { language: Language; page: StaticPage | 'tool'; toolId?: string; }

const staticPaths: Record<Exclude<StaticPage, 'not-found'>, Record<Language, string>> = {
  home: { en: '', es: '' },
  services: { en: 'services', es: 'servicios' },
  tools: { en: 'tools', es: 'herramientas' },
  about: { en: 'about', es: 'acerca' },
  transparency: { en: 'transparency', es: 'transparencia' },
  privacy: { en: 'privacy', es: 'privacidad' },
  acceptable: { en: 'acceptable-use', es: 'uso-aceptable' },
  support: { en: 'support', es: 'apoyar' },
  status: { en: 'status', es: 'estado' },
  software: { en: 'software', es: 'software' },
  labels: { en: 'privacy-labels', es: 'etiquetas-privacidad' },
};

export function parseRoute(pathname: string): Route | null {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  const language = parts.shift();
  if (language !== 'en' && language !== 'es') return null;
  const rest = parts.join('/');
  for (const [page, paths] of Object.entries(staticPaths)) {
    if (paths[language] === rest) return { language, page: page as StaticPage };
  }
  const tool = catalog.find((entry) => entry.slug?.[language] === rest);
  return tool ? { language, page: 'tool', toolId: tool.id } : { language, page: 'not-found' };
}

export function routePath(page: Exclude<StaticPage, 'not-found'>, language: Language): string {
  const suffix = staticPaths[page][language];
  return `/${language}/${suffix}${suffix ? '' : ''}`;
}

export function toolPath(id: string, language: Language): string {
  const entry = catalog.find((item) => item.id === id);
  return entry?.slug ? `/${language}/${entry.slug[language]}` : routePath('tools', language);
}

export function translatedPath(route: Route, language: Language): string {
  if (route.page === 'tool' && route.toolId) return toolPath(route.toolId, language);
  if (route.page === 'tool') return routePath('tools', language);
  if (route.page === 'not-found') return routePath('home', language);
  return routePath(route.page, language);
}
