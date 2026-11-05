import { Download, ExternalLink, GitFork, Search, Star } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { useI18n } from '../i18n/context';
import { formatCompact, formatNumber, formatRelative } from '../lib/format';
import { languageColor } from '../lib/languageColors';
import { filterRepositories, repositoriesToCsv, repositoryLanguages, type RepoSort } from '../lib/stats';
import { safeExternalUrl } from '../lib/url';
import type { RepositorySummary } from '../services/api';
import { EmptyState, Panel, WarningNotice } from './ui';

const PAGE_SIZE = 12;
const SORTS: RepoSort[] = ['stars', 'forks', 'updated', 'created', 'name'];

const controlClass =
  'h-9 rounded-md border border-hairline bg-page px-2.5 text-sm text-ink focus:outline-2 focus:outline-series-1';

function downloadCsv(username: string, repositories: RepositorySummary[]) {
  // The byte order mark lets Excel detect UTF-8, so non-English text stays intact.
  const blob = new Blob(['﻿', repositoriesToCsv(repositories)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${username}-repositories.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function RepoRow({ repository }: { repository: RepositorySummary }) {
  const { t, locale } = useI18n();
  const homepage = safeExternalUrl(repository.homepage);
  const pushed = repository.pushedAt ?? repository.updatedAt;

  return (
    <li className="border-t border-hairline py-3.5 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <a
            href={repository.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate font-medium text-link hover:underline"
          >
            {repository.name}
          </a>
          {repository.isFork && (
            <span className="rounded-full border border-hairline px-2 text-xs text-ink-2">{t('repos.fork')}</span>
          )}
          {repository.isArchived && (
            <span className="rounded-full border border-hairline px-2 text-xs text-ink-2">{t('repos.archived')}</span>
          )}
          {homepage && (
            <a
              href={homepage}
              target="_blank"
              rel="noreferrer nofollow"
              aria-label={`${t('repos.homepage')}: ${repository.name}`}
              title={t('repos.homepage')}
              className="text-ink-2 hover:text-ink"
            >
              <ExternalLink aria-hidden size={13} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-ink-2 tabular-nums">
          <span className="inline-flex items-center gap-1" title={`${formatNumber(repository.stars, locale)} ${t('repos.stars')}`}>
            <Star aria-hidden size={14} />
            <span className="sr-only">{t('repos.stars')}:</span>
            {formatCompact(repository.stars, locale)}
          </span>
          <span className="inline-flex items-center gap-1" title={`${formatNumber(repository.forks, locale)} ${t('repos.forks')}`}>
            <GitFork aria-hidden size={14} />
            <span className="sr-only">{t('repos.forks')}:</span>
            {formatCompact(repository.forks, locale)}
          </span>
        </div>
      </div>

      {repository.description && <p className="mt-1 max-w-4xl text-sm text-pretty break-words text-ink-2">{repository.description}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
        {repository.language && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: languageColor(repository.language) }} />
            {repository.language}
          </span>
        )}
        {repository.license && repository.license !== 'NOASSERTION' && <span>{repository.license}</span>}
        <span>{t('repos.pushed', { when: formatRelative(pushed, locale) })}</span>
      </div>
    </li>
  );
}

export function RepoExplorer({
  username,
  repositories,
  publicRepos,
}: {
  username: string;
  repositories: RepositorySummary[];
  publicRepos: number;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [sort, setSort] = useState<RepoSort>('stars');
  const [includeForks, setIncludeForks] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const deferredSearch = useDeferredValue(search);

  const languages = useMemo(() => repositoryLanguages(repositories), [repositories]);
  const filtered = useMemo(
    () => filterRepositories(repositories, { search: deferredSearch, language, includeForks, sort }),
    [repositories, deferredSearch, language, includeForks, sort],
  );

  const resetPaging = () => setVisible(PAGE_SIZE);
  const title = t('repos.title');

  if (repositories.length === 0) {
    return (
      <Panel title={title}>
        <EmptyState>{t('repos.none')}</EmptyState>
      </Panel>
    );
  }

  return (
    <Panel
      title={title}
      subtitle={t('repos.count', { shown: Math.min(visible, filtered.length), total: filtered.length })}
      action={
        <button
          type="button"
          onClick={() => downloadCsv(username, filtered)}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-raised hover:text-ink disabled:opacity-50"
        >
          <Download aria-hidden size={14} />
          {t('repos.export')}
        </button>
      }
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search aria-hidden size={15} className="pointer-events-none absolute left-2.5 top-2.5 text-muted" />
          <input
            type="search"
            aria-label={t('repos.search')}
            placeholder={t('repos.search')}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPaging();
            }}
            className={`${controlClass} w-full pl-8`}
          />
        </div>
        <select
          aria-label={t('repos.language')}
          value={language}
          onChange={(event) => {
            setLanguage(event.target.value);
            resetPaging();
          }}
          className={controlClass}
        >
          <option value="">{t('repos.allLanguages')}</option>
          {languages.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label={t('repos.sort')}
          value={sort}
          onChange={(event) => setSort(event.target.value as RepoSort)}
          className={controlClass}
        >
          {SORTS.map((option) => (
            <option key={option} value={option}>
              {t(`repos.sort.${option}`)}
            </option>
          ))}
        </select>
        <label className="inline-flex h-9 items-center gap-2 px-1 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={includeForks}
            onChange={(event) => {
              setIncludeForks(event.target.checked);
              resetPaging();
            }}
            className="size-4 accent-[var(--accent)]"
          />
          {t('repos.includeForks')}
        </label>
      </div>

      {repositories.length < publicRepos && (
        <WarningNotice>{t('repos.capped', { loaded: repositories.length, total: publicRepos })}</WarningNotice>
      )}

      {filtered.length === 0 ? (
        <EmptyState>{t('repos.empty')}</EmptyState>
      ) : (
        <ul>
          {filtered.slice(0, visible).map((repository) => (
            <RepoRow key={repository.name} repository={repository} />
          ))}
        </ul>
      )}

      {visible < filtered.length && (
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => setVisible(visible + PAGE_SIZE)}
            className="rounded-md border border-hairline px-4 py-1.5 text-sm text-ink-2 transition-colors hover:bg-raised hover:text-ink"
          >
            {t('repos.showMore')}
          </button>
        </div>
      )}
    </Panel>
  );
}
