import { useCallback } from 'react';
import { CompareView } from './components/CompareView';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Landing } from './components/Landing';
import { SearchForm } from './components/SearchForm';
import { useRecentSearches } from './hooks/useRecentSearches';
import { useUrlState, type View } from './hooks/useUrlState';
import { useI18n } from './i18n/context';

function App() {
  const { t } = useI18n();
  const [view, navigate] = useUrlState();
  const { recent, remember, clear } = useRecentSearches();

  const search = useCallback(
    (next: View) => {
      navigate(next);
      remember(...[next.user, next.vs].filter((name): name is string => Boolean(name)));
    },
    [navigate, remember],
  );

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        {t('app.skip')}
      </a>
      <Header onHome={() => navigate({ user: null, vs: null })} />

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        {/* Keyed so that the inputs reset to the URL on back/forward and on shared links. */}
        <SearchForm
          key={`${view.user}|${view.vs}`}
          view={view}
          recent={recent}
          onSearch={search}
          onClearRecent={clear}
        />

        <ErrorBoundary key={`boundary-${view.user}|${view.vs}`}>
          {!view.user && <Landing onSearch={search} />}
          {view.user && !view.vs && <Dashboard username={view.user} />}
          {view.user && view.vs && <CompareView first={view.user} second={view.vs} />}
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
}

export default App;
