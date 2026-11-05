/** Formatting helpers. All take the active locale so numbers and dates follow the UI language. */

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** 1,284 stays exact; larger values compact to 12.9K. */
export function formatCompact(value: number, locale: string): string {
  if (Math.abs(value) < 10_000) {
    return formatNumber(value, locale);
  }
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatPercent(value: number, locale: string): string {
  const digits = value > 0 && value < 10 ? 1 : 0;
  const format = new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  // A real but tiny share must not read as 0.0%, which looks like nothing at all.
  return value > 0 && value < 0.1 ? `<${format.format(0.001)}` : format.format(value / 100);
}

export function formatBytes(bytes: number, locale: string): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: units[unit],
    unitDisplay: 'short',
    maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0,
  }).format(value);
}

export function formatDate(value: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}

export function formatTime(value: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(value));
}

/** Formats a yyyy-MM-dd date without shifting it across time zones. */
export function formatDay(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

export function formatRelative(value: string, locale: string, now: Date = new Date()): string {
  const seconds = (new Date(value).getTime() - now.getTime()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) {
      return format.format(Math.trunc(seconds / size), unit);
    }
  }
  return format.format(0, 'minute');
}

/** Whole years between two dates, counting a year only once its anniversary has passed. */
export function yearsSince(value: string, now: Date = new Date()): number {
  const start = new Date(value);
  let years = now.getUTCFullYear() - start.getUTCFullYear();
  const anniversary = new Date(start);
  anniversary.setUTCFullYear(now.getUTCFullYear());
  if (now < anniversary) {
    years -= 1;
  }
  return Math.max(years, 0);
}
