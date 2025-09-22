import { getApiBaseUrl, resolveInitialAppMode } from '@/application/config/appConfig';

describe('app configuration helpers', () => {
  it('resolves app mode from environment values', () => {
    expect(resolveInitialAppMode('mock')).toBe('mock');
    expect(resolveInitialAppMode('live')).toBe('live');
    expect(resolveInitialAppMode(undefined)).toBe('mock');
    expect(resolveInitialAppMode(null)).toBe('mock');
    expect(resolveInitialAppMode('other')).toBe('mock');
  });

  it('reads api base url preferring env overrides', () => {
    expect(getApiBaseUrl('https://api.example.com')).toBe('https://api.example.com');
    expect(getApiBaseUrl('')).toBeUndefined();
  });
});
