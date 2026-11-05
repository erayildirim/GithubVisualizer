import { Building2, Calendar, Check, ExternalLink, Link2, Link as LinkIcon, MapPin } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n/context';
import { formatCompact, formatDate, formatNumber } from '../lib/format';
import { displayUrl, safeExternalUrl } from '../lib/url';
import type { GitHubUserInfo } from '../services/api';

function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-muted">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  const { locale } = useI18n();
  return (
    <div title={formatNumber(value, locale)}>
      <dd className="text-lg font-semibold text-ink">{formatCompact(value, locale)}</dd>
      <dt className="text-xs text-ink-2">{label}</dt>
    </div>
  );
}

function CopyLinkButton() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; the address bar still has the link.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-raised hover:text-ink"
    >
      {copied ? <Check aria-hidden size={14} /> : <Link2 aria-hidden size={14} />}
      <span aria-live="polite">{t(copied ? 'profile.copied' : 'profile.copyLink')}</span>
    </button>
  );
}

export function ProfileCard({ user, compact = false }: { user: GitHubUserInfo; compact?: boolean }) {
  const { t, locale } = useI18n();
  const blog = safeExternalUrl(user.blog);

  return (
    <section className="h-full rounded-xl border border-hairline bg-surface p-5">
      <div className="flex flex-col gap-5 sm:flex-row">
        <img
          src={user.avatarUrl}
          alt={`${user.username} avatar`}
          width={compact ? 64 : 96}
          height={compact ? 64 : 96}
          className={`shrink-0 rounded-full border border-hairline ${compact ? 'size-16' : 'size-24'}`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-ink">{user.name || user.username}</h1>
              <p className="text-ink-2">
                @{user.username}
                {user.accountType === 'Organization' && (
                  <span className="ml-2 rounded-full border border-hairline px-2 py-0.5 text-xs">
                    {t('profile.organization')}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!compact && <CopyLinkButton />}
              <a
                href={user.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-raised hover:text-ink"
              >
                <ExternalLink aria-hidden size={14} />
                {t('profile.viewOnGitHub')}
              </a>
            </div>
          </div>

          {user.bio && <p className="mt-3 max-w-3xl text-pretty text-ink">{user.bio}</p>}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
            {user.company && <Meta icon={<Building2 aria-hidden size={14} />}>{user.company}</Meta>}
            {user.location && <Meta icon={<MapPin aria-hidden size={14} />}>{user.location}</Meta>}
            {blog && (
              <Meta icon={<LinkIcon aria-hidden size={14} />}>
                <a href={blog} target="_blank" rel="noreferrer nofollow" className="text-link hover:underline">
                  {displayUrl(blog)}
                </a>
              </Meta>
            )}
            <Meta icon={<Calendar aria-hidden size={14} />}>
              {t('profile.joined', { date: formatDate(user.createdAt, locale) })}
            </Meta>
          </div>

          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <Count label={t('profile.followers')} value={user.followers} />
            <Count label={t('profile.following')} value={user.following} />
            <Count label={t('profile.repos')} value={user.publicRepos} />
            <Count label={t('profile.gists')} value={user.publicGists} />
          </dl>
        </div>
      </div>
    </section>
  );
}

export function ProfileSkeleton() {
  return (
    <section aria-busy="true" className="flex gap-5 rounded-xl border border-hairline bg-surface p-5">
      <div className="size-24 shrink-0 animate-pulse rounded-full bg-track" />
      <div className="flex-1 space-y-3 pt-1">
        <div className="h-6 w-48 animate-pulse rounded-md bg-track" />
        <div className="h-4 w-32 animate-pulse rounded-md bg-track" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-track" />
      </div>
    </section>
  );
}
