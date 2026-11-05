import { useCallback, useSyncExternalStore } from 'react';

export interface View {
  user: string | null;
  vs: string | null;
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

const getSearch = () => window.location.search;

export function parseView(search: string): View {
  const params = new URLSearchParams(search);
  const user = params.get('user')?.trim() || null;
  const vs = params.get('vs')?.trim() || null;
  return user ? { user, vs } : { user: vs, vs: null };
}

export function viewToSearch({ user, vs }: View): string {
  const params = new URLSearchParams();
  if (user) params.set('user', user);
  if (vs) params.set('vs', vs);
  const search = params.toString();
  return search ? `?${search}` : '';
}

/** Keeps the current view in the URL, so results can be shared and the back button works. */
export function useUrlState(): [View, (view: View) => void] {
  const search = useSyncExternalStore(subscribe, getSearch);

  const navigate = useCallback((view: View) => {
    const next = viewToSearch(view);
    if (next !== window.location.search) {
      window.history.pushState(null, '', `${window.location.pathname}${next}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  return [parseView(search), navigate];
}
