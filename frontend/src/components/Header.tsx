import { AlertTriangle, Gauge, Moon, Sun } from 'lucide-react';
import { useRateLimit } from '../hooks/useGitHubData';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/context';
import { formatTime } from '../lib/format';

function QuotaBadge() {
  const { t, locale } = useI18n();
  const { data } = useRateLimit();

  if (!data) {
    return null;
  }

  const low = data.remaining < Math.min(10, data.limit * 0.2);
  const title = [
    t('quota.title', { remaining: data.remaining, limit: data.limit, time: formatTime(data.resetsAt, locale) }),
    data.authenticated ? null : t('quota.noToken'),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      title={title}
      data-testid="quota-badge"
      className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs tabular-nums sm:inline-flex ${
        low ? 'border-warning-line bg-warning-bg text-warning-ink' : 'border-hairline text-ink-2'
      }`}
    >
      {low ? <AlertTriangle aria-hidden size={13} /> : <Gauge aria-hidden size={13} />}
      <span>
        {t('quota.label')} {data.remaining}/{data.limit}
        {low && ` · ${t('quota.low')}`}
      </span>
    </span>
  );
}

const iconButton =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-hairline px-2 text-sm font-medium text-ink-2 transition-colors hover:bg-raised hover:text-ink';

export function Header({ onHome }: { onHome: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const [theme, toggleTheme] = useTheme();

  return (
    <header className="border-b border-hairline bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onHome();
          }}
          className="flex items-center gap-2 rounded-md font-semibold text-ink"
        >
          <img src="/favicon.svg" alt="" width={24} height={24} />
          {t('app.name')}
        </a>

        <div className="flex items-center gap-2">
          <QuotaBadge />
          <button
            type="button"
            className={iconButton}
            aria-label={`${t('header.language')}: ${locale === 'en' ? 'TR' : 'EN'}`}
            title={t('header.language')}
            onClick={() => setLocale(locale === 'en' ? 'tr' : 'en')}
          >
            {locale === 'en' ? 'TR' : 'EN'}
          </button>
          <button
            type="button"
            className={iconButton}
            aria-label={t(theme === 'dark' ? 'header.theme.toLight' : 'header.theme.toDark')}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun aria-hidden size={16} /> : <Moon aria-hidden size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
