import { describe, expect, it } from 'vitest';
import { parseView, viewToSearch } from '../hooks/useUrlState';
import { messages } from '../i18n/messages';
import type { LanguageStats, RepositorySummary } from '../services/api';
import { formatBytes, formatCompact, formatDay, formatPercent, yearsSince } from './format';
import { languageColor, NEUTRAL_COLOR } from './languageColors';
import {
  compareLanguages,
  computeTotals,
  filterRepositories,
  foldLanguages,
  languageRows,
  repositoriesToCsv,
  reposPerYear,
} from './stats';
import { parseUsername, safeExternalUrl, USERNAME_PATTERN } from './url';

function repo(overrides: Partial<RepositorySummary> = {}): RepositorySummary {
  return {
    name: 'repo',
    htmlUrl: 'https://github.com/a/repo',
    topics: [],
    stars: 0,
    forks: 0,
    openIssues: 0,
    sizeKb: 1,
    isFork: false,
    isArchived: false,
    createdAt: '2020-06-01T00:00:00Z',
    updatedAt: '2021-01-01T00:00:00Z',
    pushedAt: '2021-01-01T00:00:00Z',
    ...overrides,
  };
}

function stats(languages: Record<string, number>): LanguageStats {
  const total = Object.values(languages).reduce((sum, value) => sum + value, 0);
  return {
    languages: Object.fromEntries(
      Object.entries(languages).map(([name, bytes]) => [name, { bytes, percentage: (bytes / total) * 100 }]),
    ),
    totalBytes: total,
    repositoriesAnalyzed: 1,
    repositoriesEligible: 1,
    isPartial: false,
  };
}

describe('safeExternalUrl', () => {
  it.each(['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,x', 'vbscript:x', 'ftp://example.com'])(
    'rejects the unsafe link %s',
    (value) => expect(safeExternalUrl(value)).toBeNull(),
  );

  it('adds https to bare domains, which is how people commonly fill in the blog field', () => {
    expect(safeExternalUrl('example.com/me')).toBe('https://example.com/me');
  });

  it('keeps http and https links', () => {
    expect(safeExternalUrl('http://example.com/')).toBe('http://example.com/');
    expect(safeExternalUrl(' https://example.com/ ')).toBe('https://example.com/');
  });

  it.each([null, undefined, '', '   '])('returns null for the empty value %s', (value) =>
    expect(safeExternalUrl(value)).toBeNull(),
  );
});

describe('parseUsername', () => {
  it.each([
    ['octocat', 'octocat'],
    ['  octocat ', 'octocat'],
    ['@octocat', 'octocat'],
    ['https://github.com/octocat', 'octocat'],
    ['github.com/octocat/hello-world?tab=readme', 'octocat'],
  ])('reads %s as %s', (input, expected) => expect(parseUsername(input)).toBe(expected));
});

describe('USERNAME_PATTERN', () => {
  it('matches the same rule the backend enforces', () => {
    expect(USERNAME_PATTERN.test('a')).toBe(true);
    expect(USERNAME_PATTERN.test('a-b-c')).toBe(true);
    expect(USERNAME_PATTERN.test('a'.repeat(39))).toBe(true);
    expect(USERNAME_PATTERN.test('a'.repeat(40))).toBe(false);
    expect(USERNAME_PATTERN.test('-a')).toBe(false);
    expect(USERNAME_PATTERN.test('a_b')).toBe(false);
    expect(USERNAME_PATTERN.test('../etc')).toBe(false);
  });
});

describe('computeTotals', () => {
  it('counts stars and forks from original work only', () => {
    const totals = computeTotals([
      repo({ name: 'a', stars: 10, forks: 2, language: 'Go' }),
      repo({ name: 'b', stars: 5, forks: 1, language: 'Go', isArchived: true }),
      repo({ name: 'c', stars: 100, language: 'Rust' }),
      repo({ name: 'd', stars: 9999, forks: 9999, isFork: true, language: 'C' }),
    ]);

    expect(totals).toEqual({ stars: 115, forks: 3, original: 3, forked: 1, archived: 1, topLanguage: 'Go' });
  });

  it('handles an account with no repositories', () => {
    expect(computeTotals([])).toEqual({ stars: 0, forks: 0, original: 0, forked: 0, archived: 0, topLanguage: null });
  });
});

describe('reposPerYear', () => {
  it('keeps quiet years visible and ignores forks', () => {
    expect(
      reposPerYear([
        repo({ createdAt: '2018-03-01T00:00:00Z' }),
        repo({ createdAt: '2021-03-01T00:00:00Z' }),
        repo({ createdAt: '2021-05-01T00:00:00Z' }),
        repo({ createdAt: '2010-01-01T00:00:00Z', isFork: true }),
      ]),
    ).toEqual([
      { year: '2018', count: 1 },
      { year: '2019', count: 0 },
      { year: '2020', count: 0 },
      { year: '2021', count: 2 },
    ]);
  });

  it('returns nothing when there are no original repositories', () => {
    expect(reposPerYear([repo({ isFork: true })])).toEqual([]);
  });
});

describe('filterRepositories', () => {
  const repositories = [
    repo({ name: 'alpha', stars: 1, forks: 9, language: 'Go', description: 'A parser', pushedAt: '2024-01-01T00:00:00Z' }),
    repo({ name: 'beta', stars: 9, forks: 1, language: 'Rust', topics: ['Compiler'], pushedAt: '2025-01-01T00:00:00Z' }),
    repo({ name: 'gamma', stars: 5, isFork: true, language: 'Go' }),
  ];
  const base = { search: '', language: '', includeForks: false, sort: 'stars' as const };
  const names = (filter: Partial<typeof base> | object) =>
    filterRepositories(repositories, { ...base, ...filter }).map((r) => r.name);

  it('hides forks by default', () => expect(names({})).toEqual(['beta', 'alpha']));
  it('can include forks', () => expect(names({ includeForks: true })).toEqual(['beta', 'gamma', 'alpha']));
  it('sorts by forks', () => expect(names({ sort: 'forks' })).toEqual(['alpha', 'beta']));
  it('sorts by last push', () => expect(names({ sort: 'updated' })).toEqual(['beta', 'alpha']));
  it('sorts by name', () => expect(names({ sort: 'name' })).toEqual(['alpha', 'beta']));
  it('filters by language', () => expect(names({ language: 'Rust' })).toEqual(['beta']));
  it('searches descriptions case-insensitively', () => expect(names({ search: 'PARSER' })).toEqual(['alpha']));
  it('searches topics', () => expect(names({ search: 'compiler' })).toEqual(['beta']));

  it('does not mutate its input', () => {
    const before = repositories.map((r) => r.name);
    filterRepositories(repositories, { ...base, sort: 'name' });
    expect(repositories.map((r) => r.name)).toEqual(before);
  });
});

describe('language helpers', () => {
  it('folds the tail into one row that still adds up', () => {
    const rows = languageRows(stats({ A: 50, B: 30, C: 15, D: 5 }));
    const { top, other } = foldLanguages(rows, 2);

    expect(top.map((row) => row.name)).toEqual(['A', 'B']);
    expect(other).toMatchObject({ bytes: 20, percentage: 20 });
  });

  it('does not fold when everything fits', () => {
    expect(foldLanguages(languageRows(stats({ A: 1 })), 8).other).toBeNull();
  });

  it('compares by the larger share in either account and fills gaps with zero', () => {
    const rows = compareLanguages(stats({ Go: 90, C: 10 }), stats({ Rust: 100 }));

    expect(rows).toEqual([
      { name: 'Rust', first: 0, second: 100 },
      { name: 'Go', first: 90, second: 0 },
      { name: 'C', first: 10, second: 0 },
    ]);
  });

  it('gives unknown languages a neutral color instead of inventing a hue', () => {
    expect(languageColor('Python')).toBe('#3572A5');
    expect(languageColor('SomeNewLanguage')).toBe(NEUTRAL_COLOR);
    expect(languageColor(null)).toBe(NEUTRAL_COLOR);
  });
});

describe('repositoriesToCsv', () => {
  it('escapes delimiters and quotes', () => {
    const csv = repositoriesToCsv([repo({ name: 'a', description: 'Hello, "world"\nline' })]);
    expect(csv).toContain('"Hello, ""world""\nline"');
  });

  it('neutralizes spreadsheet formulas in text written by repository owners', () => {
    const csv = repositoriesToCsv([repo({ name: 'a', description: '=HYPERLINK("http://evil")' })]);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
  });

  it('writes one header row plus one row per repository', () => {
    expect(repositoriesToCsv([repo(), repo()]).split('\r\n')).toHaveLength(3);
  });
});

describe('format', () => {
  it('compacts only large numbers', () => {
    expect(formatCompact(1284, 'en')).toBe('1,284');
    expect(formatCompact(12900, 'en')).toBe('12.9K');
  });

  it('formats percentages with sensible precision', () => {
    expect(formatPercent(42.4, 'en')).toBe('42%');
    expect(formatPercent(3.14, 'en')).toBe('3.1%');
    expect(formatPercent(0, 'en')).toBe('0%');
    expect(formatPercent(0.02, 'en')).toBe('<0.1%');
  });

  it('picks a readable byte unit', () => {
    expect(formatBytes(512, 'en')).toBe('512 byte');
    expect(formatBytes(1536, 'en')).toBe('1.5 kB');
    expect(formatBytes(5 * 1024 * 1024, 'en')).toBe('5 MB');
  });

  it('does not shift a calendar day across time zones', () => {
    expect(formatDay('2026-01-01', 'en')).toBe('Jan 1');
  });

  it('counts a year only after its anniversary', () => {
    const now = new Date('2026-06-15T00:00:00Z');
    expect(yearsSince('2020-06-15T00:00:00Z', now)).toBe(6);
    expect(yearsSince('2020-06-16T00:00:00Z', now)).toBe(5);
  });
});

describe('URL state', () => {
  it('round-trips a shareable view', () => {
    const view = { user: 'a', vs: 'b' };
    expect(parseView(viewToSearch(view))).toEqual(view);
  });

  it('treats a lone vs parameter as the main user', () => {
    expect(parseView('?vs=b')).toEqual({ user: 'b', vs: null });
  });

  it('has an empty URL for the landing page', () => {
    expect(viewToSearch({ user: null, vs: null })).toBe('');
    expect(parseView('')).toEqual({ user: null, vs: null });
  });
});

describe('translations', () => {
  it('fill every placeholder the English text uses', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(messages.en) as (keyof typeof messages.en)[]) {
      expect(placeholders(messages.tr[key]), key).toEqual(placeholders(messages.en[key]));
    }
  });
});
