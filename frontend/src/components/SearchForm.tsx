import { GitCompareArrows, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { View } from '../hooks/useUrlState';
import { useI18n } from '../i18n/context';
import type { MessageKey } from '../i18n/messages';
import { parseUsername, USERNAME_PATTERN } from '../lib/url';

interface SearchFormProps {
  view: View;
  recent: string[];
  onSearch: (view: View) => void;
  onClearRecent: () => void;
}

const inputClass =
  'h-11 w-full min-w-0 rounded-md border border-hairline bg-page px-3 text-base text-ink placeholder:text-muted focus:outline-2 focus:outline-series-1';

export function SearchForm({ view, recent, onSearch, onClearRecent }: SearchFormProps) {
  const { t } = useI18n();
  const [first, setFirst] = useState(view.user ?? '');
  const [second, setSecond] = useState(view.vs ?? '');
  const [comparing, setComparing] = useState(Boolean(view.vs));
  const [error, setError] = useState<MessageKey | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const user = parseUsername(first);
    const vs = comparing ? parseUsername(second) : '';

    if (!user || (comparing && !vs)) {
      setError('search.required');
    } else if (!USERNAME_PATTERN.test(user) || (vs && !USERNAME_PATTERN.test(vs))) {
      setError('search.invalid');
    } else if (vs && user.toLowerCase() === vs.toLowerCase()) {
      setError('search.same');
    } else {
      setError(null);
      onSearch({ user, vs: vs || null });
    }
  };

  return (
    <section className="rounded-xl border border-hairline bg-surface p-4">
      <form onSubmit={submit} noValidate aria-describedby={error ? 'search-error' : undefined}>
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="flex-1">
            <label htmlFor="username" className="sr-only">
              {t('search.label')}
            </label>
            <input
              id="username"
              value={first}
              onChange={(event) => setFirst(event.target.value)}
              placeholder={t('search.placeholder')}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={Boolean(error)}
              className={inputClass}
            />
          </div>

          {comparing && (
            <div className="flex-1">
              <label htmlFor="username-vs" className="sr-only">
                {t('search.compareLabel')}
              </label>
              <input
                id="username-vs"
                value={second}
                onChange={(event) => setSecond(event.target.value)}
                placeholder={t('search.comparePlaceholder')}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-invalid={Boolean(error)}
                className={inputClass}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent px-5 font-medium text-white transition-colors hover:bg-accent-hover md:flex-none"
            >
              {comparing ? <GitCompareArrows aria-hidden size={17} /> : <Search aria-hidden size={17} />}
              {t(comparing ? 'search.compare' : 'search.submit')}
            </button>
            <button
              type="button"
              onClick={() => {
                setComparing(!comparing);
                setError(null);
              }}
              aria-label={t(comparing ? 'search.removeCompare' : 'search.addCompare')}
              title={t(comparing ? 'search.removeCompare' : 'search.addCompare')}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-hairline text-ink-2 transition-colors hover:bg-raised hover:text-ink"
            >
              {comparing ? <X aria-hidden size={18} /> : <GitCompareArrows aria-hidden size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p id="search-error" role="alert" className="mt-2 text-sm text-critical-ink">
            {t(error)}
          </p>
        )}
      </form>

      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="mr-1 text-ink-2">{t('search.recent')}</span>
          {recent.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onSearch({ user: name, vs: null })}
              className="rounded-full border border-hairline px-2.5 py-0.5 text-ink-2 transition-colors hover:bg-raised hover:text-ink"
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            onClick={onClearRecent}
            aria-label={t('search.clearRecent')}
            title={t('search.clearRecent')}
            className="inline-flex size-6 items-center justify-center rounded-full text-ink-2 hover:bg-raised hover:text-ink"
          >
            <X aria-hidden size={13} />
          </button>
        </div>
      )}
    </section>
  );
}
