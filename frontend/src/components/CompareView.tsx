import { ChevronUp } from 'lucide-react';
import { useLanguages, useRepositories, useUserInfo } from '../hooks/useGitHubData';
import { useI18n } from '../i18n/context';
import { formatDate, formatNumber, formatPercent } from '../lib/format';
import { compareLanguages, computeTotals, leader, type Leader } from '../lib/stats';
import type { GitHubUserInfo, LanguageStats, RepositorySummary } from '../services/api';
import { ProfileCard, ProfileSkeleton } from './ProfileCard';
import { EmptyState, ErrorNotice, Panel, Skeleton, WarningNotice } from './ui';

interface Side {
  profile: GitHubUserInfo;
  repositories: RepositorySummary[];
}

function MetricCell({ value, leading, label }: { value: string; leading: boolean; label: string }) {
  return (
    <td className={`px-3 py-2 text-right tabular-nums ${leading ? 'font-semibold text-ink' : 'text-ink-2'}`}>
      <span className="inline-flex items-center justify-end gap-1">
        {/* The icon marks the leader, so it's never conveyed by weight alone. */}
        {leading && <ChevronUp aria-label={label} size={14} className="text-series-1" />}
        {value}
      </span>
    </td>
  );
}

function MetricsTable({ first, second }: { first: Side; second: Side }) {
  const { t, locale } = useI18n();
  const a = computeTotals(first.repositories);
  const b = computeTotals(second.repositories);

  const metrics: { label: string; first: number; second: number }[] = [
    { label: t('profile.followers'), first: first.profile.followers, second: second.profile.followers },
    { label: t('kpi.stars'), first: a.stars, second: b.stars },
    { label: t('kpi.forks'), first: a.forks, second: b.forks },
    { label: t('kpi.original'), first: a.original, second: b.original },
    { label: t('profile.repos'), first: first.profile.publicRepos, second: second.profile.publicRepos },
    { label: t('profile.gists'), first: first.profile.publicGists, second: second.profile.publicGists },
  ];

  return (
    <Panel title={t('compare.title')}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-ink-2">
            <tr className="border-b border-hairline">
              <th scope="col" className="px-3 py-2 text-left font-medium">{t('compare.metric')}</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                <SeriesKey series={1} /> {first.profile.username}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                <SeriesKey series={2} /> {second.profile.username}
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const lead: Leader = leader(metric.first, metric.second);
              return (
                <tr key={metric.label} className="border-b border-hairline last:border-b-0">
                  <th scope="row" className="px-3 py-2 text-left font-normal text-ink-2">{metric.label}</th>
                  <MetricCell value={formatNumber(metric.first, locale)} leading={lead === 'first'} label={t('compare.leads')} />
                  <MetricCell value={formatNumber(metric.second, locale)} leading={lead === 'second'} label={t('compare.leads')} />
                </tr>
              );
            })}
            <tr>
              <th scope="row" className="px-3 py-2 text-left font-normal text-ink-2">{t('compare.joined')}</th>
              <td className="px-3 py-2 text-right text-ink-2 tabular-nums">{formatDate(first.profile.createdAt, locale)}</td>
              <td className="px-3 py-2 text-right text-ink-2 tabular-nums">{formatDate(second.profile.createdAt, locale)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SeriesKey({ series }: { series: 1 | 2 }) {
  return (
    <span
      aria-hidden
      className={`mr-1 inline-block size-2.5 rounded-full ${series === 1 ? 'bg-series-1' : 'bg-series-2'}`}
    />
  );
}

function LanguageComparison({
  firstName,
  secondName,
  first,
  second,
}: {
  firstName: string;
  secondName: string;
  first: LanguageStats;
  second: LanguageStats;
}) {
  const { t, locale } = useI18n();
  const rows = compareLanguages(first, second);
  const scale = Math.max(1, ...rows.flatMap((row) => [row.first, row.second]));

  const bar = (value: number, color: string, name: string) => (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <div
          title={`${name}: ${formatPercent(value, locale)}`}
          className={`h-2.5 rounded-r-[4px] ${color}`}
          style={{ width: `${(value / scale) * 100}%`, minWidth: value > 0 ? 2 : 0 }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs text-ink-2 tabular-nums">{formatPercent(value, locale)}</span>
    </div>
  );

  return (
    <Panel title={t('compare.languages')} subtitle={t('compare.languagesSubtitle')}>
      {rows.length === 0 ? (
        <EmptyState>{t('compare.noLanguages')}</EmptyState>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-4 text-sm text-ink-2">
            <span><SeriesKey series={1} />{firstName}</span>
            <span><SeriesKey series={2} />{secondName}</span>
          </div>
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.name} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <span className="truncate text-sm text-ink" title={row.name}>{row.name}</span>
                <div className="space-y-0.5">
                  {bar(row.first, 'bg-series-1', firstName)}
                  {bar(row.second, 'bg-series-2', secondName)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {[
        { name: firstName, stats: first },
        { name: secondName, stats: second },
      ]
        .filter(({ stats }) => stats.isPartial)
        .map(({ name }) => (
          <div key={name} className="mt-3">
            <WarningNotice>{t('compare.partial', { user: name })}</WarningNotice>
          </div>
        ))}
    </Panel>
  );
}

export function CompareView({ first, second }: { first: string; second: string }) {
  const firstProfile = useUserInfo(first);
  const secondProfile = useUserInfo(second);
  const firstRepositories = useRepositories(first);
  const secondRepositories = useRepositories(second);
  const firstLanguages = useLanguages(first);
  const secondLanguages = useLanguages(second);
  const { t } = useI18n();

  const profiles = [
    { query: firstProfile, name: first },
    { query: secondProfile, name: second },
  ];

  const firstError = firstRepositories.error ?? firstLanguages.error;
  const secondError = secondRepositories.error ?? secondLanguages.error;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {profiles.map(({ query, name }) => (
          <div key={name} className="min-w-0">
            {query.isPending && <ProfileSkeleton />}
            {query.isError && <ErrorNotice error={query.error} username={name} onRetry={() => query.refetch()} />}
            {query.isSuccess && <ProfileCard user={query.data} compact />}
          </div>
        ))}
      </div>

      {firstProfile.isSuccess && firstError && <ErrorNotice error={firstError} username={first} />}
      {secondProfile.isSuccess && secondError && <ErrorNotice error={secondError} username={second} />}

      {firstProfile.isSuccess && secondProfile.isSuccess && firstRepositories.isSuccess && secondRepositories.isSuccess ? (
        <MetricsTable
          first={{ profile: firstProfile.data, repositories: firstRepositories.data }}
          second={{ profile: secondProfile.data, repositories: secondRepositories.data }}
        />
      ) : (
        (firstRepositories.isPending || secondRepositories.isPending) && (
          <Panel title={t('compare.title')}>
            <Skeleton className="h-64" />
          </Panel>
        )
      )}

      {firstProfile.isSuccess && secondProfile.isSuccess && firstLanguages.isSuccess && secondLanguages.isSuccess ? (
        <LanguageComparison
          firstName={firstProfile.data.username}
          secondName={secondProfile.data.username}
          first={firstLanguages.data}
          second={secondLanguages.data}
        />
      ) : (
        (firstLanguages.isPending || secondLanguages.isPending) && (
          <Panel title={t('compare.languages')}>
            <Skeleton className="h-64" />
          </Panel>
        )
      )}
    </div>
  );
}
