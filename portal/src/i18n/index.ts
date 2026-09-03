import { en } from './en';
import { es } from './es';

export type Language = 'en' | 'es';
export type TranslationKey = keyof typeof en;

const dictionaries = { en, es } as const;

export function translate(language: Language, key: TranslationKey): string {
  return dictionaries[language][key];
}

export function preferredLanguage(fallback: Language = 'en'): Language {
  let saved: string | null = null;
  try { saved = localStorage.getItem('portal.language'); } catch { /* Persistence can be denied; browser preference still works. */ }
  if (saved === 'en' || saved === 'es') return saved;
  for (const preferred of navigator.languages) {
    const language = preferred.toLowerCase();
    if (language === 'es' || language.startsWith('es-')) return 'es';
    if (language === 'en' || language.startsWith('en-')) return 'en';
  }
  return fallback;
}

export function setLanguagePreference(language: Language): void {
  try { localStorage.setItem('portal.language', language); } catch { /* Keep the current page usable without persistence. */ }
}
