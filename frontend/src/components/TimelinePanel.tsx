import { useI18n } from '../i18n/context';
import { reposPerYear } from '../lib/stats';
import type { RepositorySummary } from '../services/api';
import { ColumnChart } from './ColumnChart';
import { DataTable, EmptyState, Panel } from './ui';

export function TimelinePanel({ repositories }: { repositories: RepositorySummary[] }) {
  const { t } = useI18n();
  const years = reposPerYear(repositories);
  const title = t('timeline.title');

  if (years.length === 0) {
    return (
      <Panel title={title}>
        <EmptyState>{t('timeline.empty')}</EmptyState>
      </Panel>
    );
  }

  return (
    <Panel title={title} subtitle={t('timeline.subtitle')}>
      <ColumnChart
        data={years.map(({ year, count }) => ({ label: year, value: count }))}
        ariaLabel={t('timeline.subtitle')}
        valueLabel={t('timeline.repos').toLowerCase()}
      />
      <DataTable
        headers={[t('timeline.year'), t('timeline.repos')]}
        rows={years.map(({ year, count }) => [year, count])}
      />
    </Panel>
  );
}
