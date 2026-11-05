import { Activity, BarChart3, FolderGit2, GitCompareArrows } from 'lucide-react';
import type { View } from '../hooks/useUrlState';
import { useI18n } from '../i18n/context';
import type { MessageKey } from '../i18n/messages';

const FEATURES: { icon: typeof BarChart3; text: MessageKey }[] = [
  { icon: BarChart3, text: 'landing.feature.languages' },
  { icon: FolderGit2, text: 'landing.feature.repos' },
  { icon: Activity, text: 'landing.feature.activity' },
  { icon: GitCompareArrows, text: 'landing.feature.compare' },
];

const EXAMPLES = ['torvalds', 'gvanrossum', 'octocat'];

export function Landing({ onSearch }: { onSearch: (view: View) => void }) {
  const { t } = useI18n();

  return (
    <div className="py-8 text-center sm:py-14">
      <h1 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
        {t('landing.title')}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-ink-2">{t('landing.subtitle')}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-ink-2">{t('landing.try')}</span>
        {EXAMPLES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onSearch({ user: name, vs: null })}
            className="rounded-full border border-hairline bg-surface px-3 py-1 text-sm text-ink transition-colors hover:bg-raised"
          >
            {name}
          </button>
        ))}
      </div>

      <ul className="mx-auto mt-12 grid max-w-4xl gap-3 text-left sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 rounded-xl border border-hairline bg-surface p-4">
            <Icon aria-hidden size={20} className="mt-0.5 shrink-0 text-series-1" />
            <span className="text-ink-2">{t(text)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
