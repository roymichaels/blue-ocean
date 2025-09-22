export function formatTimestamp(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const locale = typeof navigator !== 'undefined' ? navigator.language : undefined;
  const formatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
  return formatter.format(date);
}

export default formatTimestamp;
