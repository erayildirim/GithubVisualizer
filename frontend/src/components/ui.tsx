import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n/context';
import { describeError } from '../lib/errors';
import { ApiError } from '../services/api';

interface PanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, subtitle, action, children, className = '' }: PanelProps) {
  return (
    <section className={`min-w-0 rounded-xl border border-hairline bg-surface p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-track ${className}`} />;
}

export function PanelSkeleton({ title, height = 'h-56' }: { title: string; height?: string }) {
  return (
    <Panel title={title}>
      <Skeleton className={height} />
    </Panel>
  );
}

interface ErrorNoticeProps {
  error: unknown;
  username?: string;
  onRetry?: () => void;
}

export function ErrorNotice({ error, username, onRetry }: ErrorNoticeProps) {
  const { t, locale } = useI18n();
  const [message, ...details] = describeError(error, t, locale, username);
  // Retrying can't make a nonexistent account appear, and it would spend quota.
  const canRetry = onRetry && !(error instanceof ApiError && ['not_found', 'invalid_username'].includes(error.code));

  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-critical-line bg-critical-bg p-4 text-critical-ink">
      <AlertCircle aria-hidden size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{message}</p>
        {details.map((detail) => (
          <p key={detail} className="mt-1">
            {detail}
          </p>
        ))}
      </div>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-critical-line px-2.5 py-1 text-sm font-medium hover:bg-surface"
        >
          <RefreshCw aria-hidden size={13} />
          {t('error.retry')}
        </button>
      )}
    </div>
  );
}

export function WarningNotice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-warning-line bg-warning-bg px-3 py-2 text-sm text-warning-ink">
      <AlertTriangle aria-hidden size={15} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-ink-2">{children}</p>;
}

/** Every chart has this twin: values stay reachable without hovering or relying on color. */
export function DataTable({ headers, rows }: { headers: [string, string]; rows: [string, string | number][] }) {
  const { t } = useI18n();
  return (
    <details className="mt-3 text-sm">
      <summary className="text-ink-2 hover:text-ink">{t('chart.viewTable')}</summary>
      <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-hairline">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-raised text-ink-2">
            <tr>
              <th scope="col" className="px-3 py-1.5 font-medium">{headers[0]}</th>
              <th scope="col" className="px-3 py-1.5 text-right font-medium">{headers[1]}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map(([label, value]) => (
              <tr key={label} className="border-t border-hairline">
                <td className="px-3 py-1.5">{label}</td>
                <td className="px-3 py-1.5 text-right">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
