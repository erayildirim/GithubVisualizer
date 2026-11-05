import { useState } from 'react';
import { useLanguages } from '../hooks/useGitHubData';
import { useI18n } from '../i18n/context';
import { formatBytes, formatPercent } from '../lib/format';
import { languageColor, NEUTRAL_COLOR } from '../lib/languageColors';
import { foldLanguages, languageRows, type LanguageRow } from '../lib/stats';
import { EmptyState, ErrorNotice, Panel, PanelSkeleton, WarningNotice } from './ui';

const VISIBLE_LANGUAGES = 8;

function SegmentedBar({ rows }: { rows: { key: string; percentage: number; color: string; label: string }[] }) {
  return (
    <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={rows.map((row) => row.label).join(', ')}>
      {rows.map((row) => (
        <span
          key={row.key}
          title={row.label}
          className="block h-full"
          style={{ width: `${row.percentage}%`, minWidth: 2, backgroundColor: row.color }}
        />
      ))}
    </div>
  );
}

function LanguageListRow({ row, color, scale, name }: { row: LanguageRow; color: string; scale: number; name: string }) {
  const { locale } = useI18n();
  return (
    <li className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_7.75rem] items-center gap-3 py-1.5 text-sm">
      <span className="flex min-w-0 items-center gap-2 text-ink">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate" title={name}>{name}</span>
      </span>
      <span aria-hidden className="h-1.5 overflow-hidden rounded-r-full bg-track">
        <span className="block h-full rounded-r-full bg-series-1" style={{ width: `${(row.percentage / scale) * 100}%` }} />
      </span>
      <span className="flex items-baseline justify-end gap-2 tabular-nums">
        <span className="font-medium text-ink">{formatPercent(row.percentage, locale)}</span>
        <span className="w-16 text-right text-xs text-ink-2">{formatBytes(row.bytes, locale)}</span>
      </span>
    </li>
  );
}

export function LanguagePanel({ username }: { username: string }) {
  const { t, locale } = useI18n();
  const query = useLanguages(username);
  const [expanded, setExpanded] = useState(false);
  const title = t('languages.title');

  if (query.isPending) {
    return <PanelSkeleton title={title} height="h-64" />;
  }
  if (query.isError) {
    return (
      <Panel title={title}>
        <ErrorNotice error={query.error} username={username} onRetry={() => query.refetch()} />
      </Panel>
    );
  }

  const stats = query.data;
  const rows = languageRows(stats);
  if (rows.length === 0) {
    return (
      <Panel title={title}>
        <EmptyState>{t('languages.empty')}</EmptyState>
      </Panel>
    );
  }

  const { top, other } = foldLanguages(rows, VISIBLE_LANGUAGES);
  const listed = expanded ? rows : top;
  const scale = rows[0].percentage || 1;
  const otherName = t('languages.other');

  const segments = [
    ...top.map((row) => ({ key: row.name, percentage: row.percentage, color: languageColor(row.name), name: row.name })),
    ...(other ? [{ key: '__other', percentage: other.percentage, color: NEUTRAL_COLOR, name: otherName }] : []),
  ]
    .filter((segment) => segment.percentage >= 0.1)
    .map((segment) => ({ ...segment, label: `${segment.name} ${formatPercent(segment.percentage, locale)}` }));

  return (
    <Panel title={title} subtitle={t('languages.subtitle')}>
      <SegmentedBar rows={segments} />

      <ul className="mt-3">
        {listed.map((row) => (
          <LanguageListRow key={row.name} row={row} name={row.name} color={languageColor(row.name)} scale={scale} />
        ))}
        {!expanded && other && <LanguageListRow row={other} name={otherName} color={NEUTRAL_COLOR} scale={scale} />}
      </ul>

      {other && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm text-link hover:underline"
        >
          {expanded ? t('languages.showLess') : t('languages.showAll', { count: rows.length })}
        </button>
      )}

      {stats.isPartial && (
        <div className="mt-3">
          <WarningNotice>
            {t('languages.coverage', { analyzed: stats.repositoriesAnalyzed, eligible: stats.repositoriesEligible })}
          </WarningNotice>
        </div>
      )}
    </Panel>
  );
}
