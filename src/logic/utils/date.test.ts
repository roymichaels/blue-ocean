import { formatOrderTimestamp, formatRelativeTime } from './date';

describe('date utilities', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a readable timestamp with bullet separator', () => {
    const result = formatOrderTimestamp('2024-01-01T00:00:00.000Z');

    expect(result).not.toBe('Unknown time');
    expect(result.includes('•')).toBe(true);
  });

  it('falls back gracefully when the timestamp is invalid', () => {
    expect(formatOrderTimestamp('not-a-date')).toBe('Unknown time');
  });

  it('describes relative times in natural language', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-02T00:00:00.000Z').getTime());

    expect(formatRelativeTime('2024-01-02T00:00:00.000Z')).toBe('just now');
    expect(formatRelativeTime('2024-01-01T23:30:00.000Z')).toBe('30 min ago');
    expect(formatRelativeTime('2024-01-01T12:00:00.000Z')).toBe('12 hrs ago');
    expect(formatRelativeTime('2023-12-26T00:00:00.000Z')).toBe('1 wk ago');
  });
});
