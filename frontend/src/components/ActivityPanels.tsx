import { useActivity } from '../hooks/useGitHubData';
import { useI18n } from '../i18n/context';
import type { MessageKey } from '../i18n/messages';
import { messages } from '../i18n/messages';
import { formatDay, formatNumber } from '../lib/format';
import { ColumnChart } from './ColumnChart';
import { DataTable, EmptyState, ErrorNotice, Panel, PanelSkeleton } from './ui';

function eventLabel(type: string, t: (key: MessageKey) => string): string {
  const key = `event.${type}`;
  return key in messages.en ? t(key as MessageKey) : type.replace(/Event$/, '');
}

export function ActivityPanels({ username }: { username: string }) {
  const { t, locale } = useI18n();
  const query = useActivity(username);
  const title = t('activity.title');
  const byTypeTitle = t('activity.byType');

  if (query.isPending) {
    return (
      <>
        <PanelSkeleton title={title} />
        <PanelSkeleton title={byTypeTitle} />
      </>
    );
  }
  if (query.isError) {
    return (
      <Panel title={title} className="lg:col-span-2">
        <ErrorNotice error={query.error} username={username} onRetry={() => query.refetch()} />
      </Panel>
    );
  }

  const activity = query.data;
  if (activity.totalEvents === 0) {
    return (
      <Panel title={title} className="lg:col-span-2">
        <EmptyState>{t('activity.empty')}</EmptyState>
      </Panel>
    );
  }

  const days = activity.byDay.map((day) => ({ label: formatDay(day.date, locale), value: day.count }));
  const maxType = Math.max(...activity.byType.map((type) => type.count));

  return (
    <>
      <Panel title={title} subtitle={t('activity.subtitle', { count: formatNumber(activity.totalEvents, locale) })}>
        <ColumnChart
          data={days}
          ariaLabel={t('activity.subtitle', { count: activity.totalEvents })}
          valueLabel={t('activity.events')}
        />
        <DataTable
          headers={[t('chart.date'), t('chart.count')]}
          rows={days.filter((day) => day.value > 0).map((day) => [day.label, day.value])}
        />
        <p className="mt-2 text-xs text-ink-2">{t('activity.limit')}</p>
      </Panel>

      <Panel title={byTypeTitle} subtitle={t('activity.byTypeSubtitle')}>
        <ul className="space-y-2">
          {activity.byType.map((type) => (
            <li key={type.name} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-ink">{eventLabel(type.name, t)}</span>
                <span className="font-medium text-ink tabular-nums">{formatNumber(type.count, locale)}</span>
              </div>
              <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-r-full bg-track">
                <div className="h-full rounded-r-full bg-series-1" style={{ width: `${(type.count / maxType) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>

        {activity.topRepositories.length > 0 && (
          <div className="mt-5 border-t border-hairline pt-4">
            <h3 className="mb-2 text-sm font-medium text-ink-2">{t('activity.topRepos')}</h3>
            <ul className="space-y-1 text-sm">
              {activity.topRepositories.map((repository) => (
                <li key={repository.name} className="flex items-baseline justify-between gap-3">
                  <a
                    href={`https://github.com/${repository.name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-link hover:underline"
                  >
                    {repository.name}
                  </a>
                  <span className="text-ink-2 tabular-nums">{formatNumber(repository.count, locale)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </>
  );
}
