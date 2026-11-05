import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readStorage, writeStorage } from '../lib/storage';
import { I18nContext, type Translate } from './context';
import { messages, type Locale } from './messages';

function initialLocale(): Locale {
  const stored = readStorage('locale');
  if (stored === 'en' || stored === 'tr') {
    return stored;
  }
  return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export function I18nProvider({ children, locale: fixedLocale }: { children: ReactNode; locale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => fixedLocale ?? initialLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeStorage('locale', next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback<Translate>(
    (key, values) => {
      let text: string = messages[locale][key];
      for (const [name, value] of Object.entries(values ?? {})) {
        // A function, because a plain replacement string would interpret "$&" in user-supplied values.
        text = text.replace(`{${name}}`, () => String(value));
      }
      return text;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
