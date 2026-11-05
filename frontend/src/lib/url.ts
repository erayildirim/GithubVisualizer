/**
 * Makes a profile-supplied link safe to render. Blog and homepage values are free text written by
 * GitHub users, so a value like "javascript:alert(1)" must never reach an href.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const candidate = hasScheme && !/^https?:\/\//i.test(value) ? null : hasScheme ? value : `https://${value}`;
  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/** The readable part of a link: no scheme, no www, no trailing slash. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

/** Normalizes search input, including a pasted profile URL or an @handle, to a bare username. */
export function parseUsername(input: string): string {
  const value = input.trim();
  const fromUrl = value.match(/github\.com\/([^/?#\s]+)/i);
  return (fromUrl ? fromUrl[1] : value).replace(/^@/, '');
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/;
