import summaries from './guide-index.generated.json' with { type: 'json' };
import type { Language } from '../i18n/index.ts';

// Regenerated before development/build from the canonical guide content.
export const practicalGuides = summaries;
export function practicalGuidePath(id: string, language: Language): string {
  const guide = practicalGuides.find(item => item.id === id);
  return guide ? `/${language}/${guide.paths[language]}` : `/${language}/${language === 'es' ? 'guias' : 'guides'}`;
}
