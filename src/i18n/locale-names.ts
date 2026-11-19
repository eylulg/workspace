import { type Locale, locales } from './routing';

/** Each language is named in itself, so a reader can find their own language in any locale. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', tr: 'Türkçe', de: 'Deutsch' };

export function localeName(locale: string): string {
  const known = locales.find((item) => item === locale);
  return known ? LOCALE_NAMES[known] : locale;
}
