import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { I18nProvider } from './i18n/I18nProvider';
import { createQueryClient } from './lib/queryClient';
import { ApiError, githubApi, type GitHubUserInfo, type RepositorySummary } from './services/api';

// Recharts measures real layout, which jsdom doesn't have. Chart geometry is checked in the running app.
vi.mock('recharts', async (original) => {
  const actual = await original<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div> };
});

const user: GitHubUserInfo = {
  username: 'octocat',
  name: 'The Octocat',
  avatarUrl: 'https://avatars.githubusercontent.com/u/1',
  htmlUrl: 'https://github.com/octocat',
  bio: 'Mascot',
  blog: 'javascript:alert(1)',
  accountType: 'User',
  followers: 12000,
  following: 9,
  publicRepos: 2,
  publicGists: 8,
  createdAt: '2011-01-25T18:44:36Z',
};

const repository = (overrides: Partial<RepositorySummary>): RepositorySummary => ({
  name: 'hello-world',
  htmlUrl: 'https://github.com/octocat/hello-world',
  topics: [],
  stars: 100,
  forks: 10,
  openIssues: 0,
  sizeKb: 10,
  isFork: false,
  isArchived: false,
  createdAt: '2020-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

function renderApp(url = '/') {
  window.history.pushState(null, '', url);
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <I18nProvider locale="en">
        <App />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(githubApi, 'getRateLimit').mockResolvedValue({
    limit: 60,
    remaining: 42,
    resetsAt: '2030-01-01T00:00:00Z',
    authenticated: false,
  });
  vi.spyOn(githubApi, 'getUserInfo').mockResolvedValue(user);
  vi.spyOn(githubApi, 'getUserRepositories').mockResolvedValue([
    repository({ name: 'hello-world', language: 'Go', description: 'First' }),
    repository({ name: 'spoon-knife', language: 'HTML', stars: 5, description: 'Second' }),
    repository({ name: 'forked-thing', isFork: true, stars: 9000 }),
  ]);
  vi.spyOn(githubApi, 'getUserLanguageStats').mockResolvedValue({
    languages: { Go: { bytes: 750, percentage: 75 }, HTML: { bytes: 250, percentage: 25 } },
    totalBytes: 1000,
    repositoriesAnalyzed: 2,
    repositoriesEligible: 2,
    isPartial: false,
  });
  vi.spyOn(githubApi, 'getUserActivity').mockResolvedValue({
    totalEvents: 3,
    from: '2026-10-07',
    to: '2026-11-05',
    byDay: [{ date: '2026-11-05', count: 3 }],
    byType: [{ name: 'PushEvent', count: 3 }],
    topRepositories: [{ name: 'octocat/hello-world', count: 3 }],
  });
});

describe('search', () => {
  it('shows the landing page first and loads nothing from GitHub', async () => {
    renderApp();

    expect(screen.getByRole('heading', { name: /story behind any GitHub profile/i })).toBeInTheDocument();
    expect(githubApi.getUserInfo).not.toHaveBeenCalled();
  });

  it('puts the search in the URL and shows results', async () => {
    renderApp();

    await userEvent.type(screen.getByLabelText('GitHub username'), 'https://github.com/octocat{Enter}');

    expect(await screen.findByRole('heading', { name: 'The Octocat' })).toBeInTheDocument();
    expect(window.location.search).toBe('?user=octocat');
  });

  it('rejects an invalid username without calling the API', async () => {
    renderApp();

    await userEvent.type(screen.getByLabelText('GitHub username'), 'not valid!{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent(/valid GitHub username/i);
    expect(githubApi.getUserInfo).not.toHaveBeenCalled();
  });

  it('asks for two different names when comparing', async () => {
    renderApp();

    await userEvent.click(screen.getByRole('button', { name: 'Compare with another user' }));
    await userEvent.type(screen.getByLabelText('GitHub username'), 'octocat');
    await userEvent.type(screen.getByLabelText('Username to compare with'), 'OCTOCAT{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent(/two different usernames/i);
  });

  it('restores a shared link and follows the back button', async () => {
    renderApp('/?user=octocat');
    expect(await screen.findByRole('heading', { name: 'The Octocat' })).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub username')).toHaveValue('octocat');

    window.history.pushState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(await screen.findByRole('heading', { name: /story behind/i })).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub username')).toHaveValue('');
  });
});

describe('dashboard', () => {
  it('renders every section from the API data', async () => {
    renderApp('/?user=octocat');

    expect(await screen.findByRole('heading', { name: 'The Octocat' })).toBeInTheDocument();
    expect(await screen.findByText('Stars earned')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Languages' })).toBeInTheDocument();
    expect(await screen.findByText('75%')).toBeInTheDocument();
    expect(await screen.findByText('Pushes')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'hello-world' })).toBeInTheDocument();
    expect(await screen.findByText(/42\/60/)).toBeInTheDocument();
  });

  it('never renders an unsafe profile link', async () => {
    renderApp('/?user=octocat');
    await screen.findByRole('heading', { name: 'The Octocat' });

    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it('hides forks from totals and the list until asked', async () => {
    renderApp('/?user=octocat');

    expect(await screen.findByRole('link', { name: 'hello-world' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'forked-thing' })).not.toBeInTheDocument();
    expect(within(screen.getByText('Stars earned').parentElement!).getByText('105')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Include forks' }));

    expect(screen.getByRole('link', { name: 'forked-thing' })).toBeInTheDocument();
  });

  it('filters repositories as you type', async () => {
    renderApp('/?user=octocat');
    await screen.findByRole('link', { name: 'hello-world' });

    await userEvent.type(screen.getByRole('searchbox'), 'spoon');

    await waitFor(() => expect(screen.queryByRole('link', { name: 'hello-world' })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'spoon-knife' })).toBeInTheDocument();
  });

  it('says plainly when language data is incomplete', async () => {
    vi.mocked(githubApi.getUserLanguageStats).mockResolvedValue({
      languages: { Go: { bytes: 1, percentage: 100 } },
      totalBytes: 1,
      repositoriesAnalyzed: 30,
      repositoriesEligible: 120,
      isPartial: true,
    });
    renderApp('/?user=octocat');

    expect(await screen.findByText(/Based on 30 of 120 repositories/)).toBeInTheDocument();
  });
});

describe('errors', () => {
  it('explains an unknown user and spends no further quota on it', async () => {
    vi.mocked(githubApi.getUserInfo).mockRejectedValue(new ApiError('not_found', 404));
    renderApp('/?user=ghost');

    expect(await screen.findByRole('alert')).toHaveTextContent('No GitHub account named “ghost” exists.');
    expect(githubApi.getUserRepositories).not.toHaveBeenCalled();
    expect(githubApi.getUserLanguageStats).not.toHaveBeenCalled();
    expect(githubApi.getUserActivity).not.toHaveBeenCalled();
  });

  it('keeps the rest of the dashboard when one panel hits the quota', async () => {
    vi.mocked(githubApi.getUserLanguageStats).mockRejectedValue(
      new ApiError('rate_limited', 429, '2030-01-01T12:00:00Z'),
    );
    renderApp('/?user=octocat');

    expect(await screen.findByRole('alert')).toHaveTextContent(/API limit has been reached/);
    expect(screen.getByRole('heading', { name: 'The Octocat' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'hello-world' })).toBeInTheDocument();
  });

  it('lets the user retry a failed panel', async () => {
    vi.mocked(githubApi.getUserActivity).mockRejectedValueOnce(new ApiError('upstream_error', 502));
    renderApp('/?user=octocat');

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Pushes')).toBeInTheDocument();
  });
});

describe('comparison', () => {
  it('shows both accounts with a leader for each metric', async () => {
    vi.mocked(githubApi.getUserInfo).mockImplementation(async (username) => ({
      ...user,
      username,
      name: username,
      followers: username === 'first' ? 10 : 20,
    }));
    renderApp('/?user=first&vs=second');

    expect(await screen.findByRole('heading', { name: 'first' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'second' })).toBeInTheDocument();

    const row = (await screen.findByRole('rowheader', { name: 'Followers' })).closest('tr')!;
    const [firstCell, secondCell] = within(row).getAllByRole('cell');
    expect(firstCell).toHaveTextContent('10');
    expect(within(firstCell).queryByLabelText('Leads')).toBeNull();
    expect(within(secondCell).getByLabelText('Leads')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Language share' })).toBeInTheDocument();
  });
});

describe('preferences', () => {
  it('switches the interface language', async () => {
    window.history.pushState(null, '', '/');
    render(
      <QueryClientProvider client={createQueryClient()}>
        <I18nProvider>
          <App />
        </I18nProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Change language: TR' }));

    expect(screen.getByRole('button', { name: 'Analiz et' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('tr');
    expect(localStorage.getItem('locale')).toBe('tr');
  });

  it('toggles and remembers the theme', async () => {
    document.documentElement.setAttribute('data-theme', 'light');
    renderApp();

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
