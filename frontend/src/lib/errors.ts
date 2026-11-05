import type { Translate } from '../i18n/context';
import { ApiError } from '../services/api';
import { formatTime } from './format';

/** Turns a failed request into a translated message, followed by any extra guidance. */
export function describeError(error: unknown, t: Translate, locale: string, username?: string): string[] {
  const apiError = error instanceof ApiError ? error : new ApiError('unknown');
  switch (apiError.code) {
    case 'not_found':
      return [t('error.not_found', { username: username ?? '' })];
    case 'rate_limited':
      return [
        apiError.resetsAt
          ? t('error.rate_limited', { time: formatTime(apiError.resetsAt, locale) })
          : t('error.rate_limited_generic'),
        t('error.rate_limited_hint'),
      ];
    default:
      return [t(`error.${apiError.code}`)];
  }
}
