import { useI18n } from '../i18n/context';
import { formatCompact, formatNumber, yearsSince } from '../lib/format';
import { languageColor } from '../lib/languageColors';
import { computeTotals } from '../lib/stats';
import type { GitHubUserInfo, RepositorySummary } from '../services/api';
import { Skeleton } from './ui';

interface TileProps {
  label: string;
  value: string;
  exact?: string;
  hint?: string;
  swatch?: string;
}

function Tile({ label, value, exact, hint, swatch }: TileProps) {
  return (
    <div className="min-w-0 rounded-xl border border-hairline bg-surface p-4">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-2 text-2xl font-semibold text-ink" title={exact ?? value}>
        {swatch && <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: swatch }} />}
        <span className="truncate">{value}</span>
      </dd>
      {hint && <dd className="mt-0.5 truncate text-xs text-ink-2">{hint}</dd>}
    </div>
  );
}

export function KpiRow({ user, repositories }: { user: GitHubUserInfo; repositories: RepositorySummary[] }) {
  const { t, locale } = useI18n();
  const totals = computeTotals(repositories);

  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      <Tile label={t('kpi.stars')} value={formatCompact(totals.stars, locale)} exact={formatNumber(totals.stars, locale)} />
      <Tile label={t('kpi.forks')} value={formatCompact(totals.forks, locale)} exact={formatNumber(totals.forks, locale)} />
      <Tile
        label={t('kpi.original')}
        value={formatNumber(totals.original, locale)}
        hint={totals.forked > 0 ? t('kpi.forkedHint', { count: totals.forked }) : undefined}
      />
      <Tile
        label={t('kpi.topLanguage')}
        value={totals.topLanguage ?? t('kpi.none')}
        swatch={totals.topLanguage ? languageColor(totals.topLanguage) : undefined}
        hint={totals.topLanguage ? t('kpi.topLanguageHint') : undefined}
      />
      <Tile label={t('kpi.age')} value={formatNumber(yearsSince(user.createdAt), locale)} />
    </dl>
  );
}

export function KpiSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {[0, 1, 2, 3, 4].map((item) => (
        <Skeleton key={item} className="h-[88px] rounded-xl" />
      ))}
    </div>
  );
}
