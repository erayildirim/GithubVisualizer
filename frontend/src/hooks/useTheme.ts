import { useCallback, useState } from 'react';
import { writeStorage } from '../lib/storage';

export type Theme = 'light' | 'dark';

/** public/theme-init.js has already applied the stored or system theme before first paint. */
const currentTheme = (): Theme =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  const toggle = useCallback(() => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    writeStorage('theme', next);
    setTheme(next);
  }, []);

  return [theme, toggle];
}
