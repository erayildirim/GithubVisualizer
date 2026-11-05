import { useRepositories, useUserInfo } from '../hooks/useGitHubData';
import { useI18n } from '../i18n/context';
import type { GitHubUserInfo } from '../services/api';
import { ActivityPanels } from './ActivityPanels';
import { KpiRow, KpiSkeleton } from './KpiRow';
import { LanguagePanel } from './LanguagePanel';
import { ProfileCard, ProfileSkeleton } from './ProfileCard';
import { RepoExplorer } from './RepoExplorer';
import { TimelinePanel } from './TimelinePanel';
import { ErrorNotice, Panel, PanelSkeleton } from './ui';

/**
 * Each panel loads and fails on its own: a quota error in the language breakdown shouldn't
 * hide a profile that loaded fine. Panels wait for the profile so a 404 spends no further quota.
 */
export function Dashboard({ username }: { username: string }) {
  const profile = useUserInfo(username);

  if (profile.isPending) {
    return (
      <div className="space-y-6">
        <ProfileSkeleton />
        <KpiSkeleton />
      </div>
    );
  }

  if (profile.isError) {
    return <ErrorNotice error={profile.error} username={username} onRetry={() => profile.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <ProfileCard user={profile.data} />
      <DashboardBody username={username} profile={profile.data} />
    </div>
  );
}

function DashboardBody({ username, profile }: { username: string; profile: GitHubUserInfo }) {
  const { t } = useI18n();
  const repositories = useRepositories(username);

  return (
    <>
      {repositories.isPending && <KpiSkeleton />}
      {repositories.isSuccess && <KpiRow user={profile} repositories={repositories.data} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <LanguagePanel username={username} />
        {repositories.isPending && <PanelSkeleton title={t('timeline.title')} />}
        {repositories.isSuccess && <TimelinePanel repositories={repositories.data} />}
        <ActivityPanels username={username} />
      </div>

      {repositories.isPending && <PanelSkeleton title={t('repos.title')} height="h-96" />}
      {repositories.isError && (
        <Panel title={t('repos.title')}>
          <ErrorNotice error={repositories.error} username={username} onRetry={() => repositories.refetch()} />
        </Panel>
      )}
      {repositories.isSuccess && (
        <RepoExplorer username={username} repositories={repositories.data} publicRepos={profile.publicRepos} />
      )}
    </>
  );
}
