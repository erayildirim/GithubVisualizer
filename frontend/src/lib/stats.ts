import type { LanguageStats, RepositorySummary } from '../services/api';

export interface RepoTotals {
  stars: number;
  forks: number;
  original: number;
  forked: number;
  archived: number;
  topLanguage: string | null;
}

/** Stars and forks count original work only, so forking a popular project doesn't inflate them. */
export function computeTotals(repositories: RepositorySummary[]): RepoTotals {
  const original = repositories.filter((repository) => !repository.isFork);
  const languageCounts = new Map<string, number>();
  for (const { language } of original) {
    if (language) {
      languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1);
    }
  }

  return {
    stars: original.reduce((sum, repository) => sum + repository.stars, 0),
    forks: original.reduce((sum, repository) => sum + repository.forks, 0),
    original: original.length,
    forked: repositories.length - original.length,
    archived: repositories.filter((repository) => repository.isArchived).length,
    topLanguage: [...languageCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
  };
}

/** Repositories created per year, without gaps, so quiet years stay visible. */
export function reposPerYear(repositories: RepositorySummary[]): { year: string; count: number }[] {
  const original = repositories.filter((repository) => !repository.isFork);
  if (original.length === 0) {
    return [];
  }

  const counts = new Map<number, number>();
  for (const { createdAt } of original) {
    const year = new Date(createdAt).getUTCFullYear();
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  const years = [...counts.keys()];
  const result = [];
  for (let year = Math.min(...years); year <= Math.max(...years); year += 1) {
    result.push({ year: String(year), count: counts.get(year) ?? 0 });
  }
  return result;
}

export type RepoSort = 'stars' | 'forks' | 'updated' | 'created' | 'name';

export interface RepoFilter {
  search: string;
  language: string;
  includeForks: boolean;
  sort: RepoSort;
}

const lastActivity = (repository: RepositorySummary) =>
  new Date(repository.pushedAt ?? repository.updatedAt).getTime();

const COMPARATORS: Record<RepoSort, (a: RepositorySummary, b: RepositorySummary) => number> = {
  stars: (a, b) => b.stars - a.stars,
  forks: (a, b) => b.forks - a.forks,
  updated: (a, b) => lastActivity(b) - lastActivity(a),
  created: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  name: () => 0,
};

export function filterRepositories(repositories: RepositorySummary[], filter: RepoFilter): RepositorySummary[] {
  const search = filter.search.trim().toLowerCase();
  return repositories
    .filter((repository) => filter.includeForks || !repository.isFork)
    .filter((repository) => !filter.language || repository.language === filter.language)
    .filter(
      (repository) =>
        !search ||
        repository.name.toLowerCase().includes(search) ||
        repository.description?.toLowerCase().includes(search) ||
        repository.topics.some((topic) => topic.toLowerCase().includes(search)),
    )
    .sort((a, b) => COMPARATORS[filter.sort](a, b) || a.name.localeCompare(b.name));
}

export function repositoryLanguages(repositories: RepositorySummary[]): string[] {
  const languages = repositories.flatMap((repository) => (repository.language ? [repository.language] : []));
  return [...new Set(languages)].sort((a, b) => a.localeCompare(b));
}

export interface LanguageRow {
  name: string;
  bytes: number;
  percentage: number;
}

export function languageRows(stats: LanguageStats): LanguageRow[] {
  return Object.entries(stats.languages)
    .map(([name, info]) => ({ name, bytes: info.bytes, percentage: info.percentage }))
    .sort((a, b) => b.bytes - a.bytes);
}

/** Keeps the largest languages and folds the tail into one row, because a bar can't show 40 slivers. */
export function foldLanguages(rows: LanguageRow[], limit: number): { top: LanguageRow[]; other: LanguageRow | null } {
  if (rows.length <= limit) {
    return { top: rows, other: null };
  }
  const tail = rows.slice(limit);
  return {
    top: rows.slice(0, limit),
    other: {
      name: 'Other',
      bytes: tail.reduce((sum, row) => sum + row.bytes, 0),
      percentage: tail.reduce((sum, row) => sum + row.percentage, 0),
    },
  };
}

export interface LanguageComparison {
  name: string;
  first: number;
  second: number;
}

/** The languages that matter most across two accounts, by their larger share in either one. */
export function compareLanguages(first: LanguageStats, second: LanguageStats, limit = 8): LanguageComparison[] {
  const names = new Set([...Object.keys(first.languages), ...Object.keys(second.languages)]);
  return [...names]
    .map((name) => ({
      name,
      first: first.languages[name]?.percentage ?? 0,
      second: second.languages[name]?.percentage ?? 0,
    }))
    .sort((a, b) => Math.max(b.first, b.second) - Math.max(a.first, a.second))
    .slice(0, limit);
}

export type Leader = 'first' | 'second' | 'tie';

export function leader(first: number, second: number): Leader {
  if (first === second) {
    return 'tie';
  }
  return first > second ? 'first' : 'second';
}

/** A leading =, +, - or @ would run as a formula when the file opens in a spreadsheet. */
function csvCell(value: string | number | boolean | null | undefined): string {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function repositoriesToCsv(repositories: RepositorySummary[]): string {
  const header = ['name', 'description', 'language', 'stars', 'forks', 'open_issues', 'license', 'fork', 'archived', 'created_at', 'pushed_at', 'url'];
  const rows = repositories.map((repository) =>
    [
      repository.name,
      repository.description,
      repository.language,
      repository.stars,
      repository.forks,
      repository.openIssues,
      repository.license,
      repository.isFork,
      repository.isArchived,
      repository.createdAt,
      repository.pushedAt,
      repository.htmlUrl,
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.join(','), ...rows].join('\r\n');
}
