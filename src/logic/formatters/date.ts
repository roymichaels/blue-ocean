const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatOrderTimestamp(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return MONTH_FORMAT.format(date).replace(',', ' •');
}

export function formatRelativeTime(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return 'just now';
  }
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diffMs < minute) {
    return 'just now';
  }
  if (diffMs < hour) {
    const minutes = Math.round(diffMs / minute);
    return `${minutes} min ago`;
  }
  if (diffMs < day) {
    const hours = Math.round(diffMs / hour);
    return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  }
  if (diffMs < week) {
    const days = Math.round(diffMs / day);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (diffMs < month) {
    const weeks = Math.round(diffMs / week);
    return `${weeks} wk${weeks > 1 ? 's' : ''} ago`;
  }
  if (diffMs < year) {
    const months = Math.round(diffMs / month);
    return `${months} mo${months > 1 ? 's' : ''} ago`;
  }
  const years = Math.round(diffMs / year);
  return `${years} yr${years > 1 ? 's' : ''} ago`;
}
