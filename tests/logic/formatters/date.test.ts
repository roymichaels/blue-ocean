import { formatOrderTimestamp, formatRelativeTime } from '@/logic/formatters/date';

describe('date formatting helpers', () => {
  it('formats order timestamps with readable month and day', () => {
    const formatted = formatOrderTimestamp('2024-01-05T12:34:00Z');
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('•');
  });

  it('handles invalid timestamps gracefully', () => {
    expect(formatOrderTimestamp('not-a-date')).toBe('Unknown time');
  });

  it('returns human readable relative ranges', () => {
    const now = Date.now();
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now);
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneHourAgo)).toContain('hr');
    const oldValue = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oldValue)).toContain('wk');
    spy.mockRestore();
  });

  it('falls back to immediate label when parsing fails', () => {
    expect(formatRelativeTime('invalid')).toBe('just now');
  });
});
