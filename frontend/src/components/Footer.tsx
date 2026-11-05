import { useI18n } from '../i18n/context';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm text-ink-2 sm:px-6">
        <span>{t('footer.data')}</span>
        <a
          href="https://github.com/erayildirim/GithubVisualizer"
          target="_blank"
          rel="noreferrer"
          className="text-link hover:underline"
        >
          {t('footer.source')}
        </a>
      </div>
    </footer>
  );
}
