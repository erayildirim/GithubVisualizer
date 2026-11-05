import { useCallback, useState } from 'react';
import { readStorage, removeStorage, writeStorage } from '../lib/storage';

const KEY = 'recent-searches';
const LIMIT = 6;

function load(): string[] {
  try {
    const parsed: unknown = JSON.parse(readStorage(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>(load);

  const remember = useCallback((...usernames: string[]) => {
    setRecent((current) => {
      const lowered = usernames.map((username) => username.toLowerCase());
      const next = [...usernames, ...current.filter((item) => !lowered.includes(item.toLowerCase()))].slice(0, LIMIT);
      writeStorage(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    removeStorage(KEY);
    setRecent([]);
  }, []);

  return { recent, remember, clear };
}
