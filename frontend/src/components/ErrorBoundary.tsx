import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useI18n } from '../i18n/context';

function CrashNotice() {
  const { t } = useI18n();
  return (
    <div role="alert" className="rounded-lg border border-critical-line bg-critical-bg p-4 text-sm text-critical-ink">
      <p className="font-medium">{t('error.title')}</p>
      <p className="mt-1">{t('error.crash')}</p>
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render failure', error, info.componentStack);
  }

  render() {
    return this.state.failed ? <CrashNotice /> : this.props.children;
  }
}
