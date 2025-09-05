/* eslint-disable no-restricted-syntax */
import { stripTabsPrefix, push, replace, toTab } from '@/services/navigation';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

describe('stripTabsPrefix', () => {
  it('removes group prefix when present', () => {
    expect(stripTabsPrefix('/(tabs)/profile')).toBe('/profile');
  });

  it('returns undefined for nullish values', () => {
    expect(stripTabsPrefix(undefined)).toBeUndefined();
    expect(stripTabsPrefix(null)).toBeUndefined();
  });

  it('leaves path unchanged if no prefix', () => {
    expect(stripTabsPrefix('/profile')).toBe('/profile');
  });

  it('does not alter root group path without trailing slash', () => {
    expect(stripTabsPrefix('/(tabs)')).toBe('/(tabs)');
  });

  it('handles nested routes and query strings', () => {
    expect(stripTabsPrefix('/(tabs)/orders/123?foo=bar')).toBe('/orders/123?foo=bar');
  });
});

describe('navigation helpers', () => {
  const { router } = require('expo-router');

  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
  });

  it('push strips group prefix before routing', () => {
    push('/(tabs)/orders');
    expect(router.push).toHaveBeenCalledWith('/orders');
  });

  it('replace strips group prefix in pathname objects', () => {
    replace({ pathname: '/(tabs)/orders', params: { foo: 'bar' } });
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/orders', params: { foo: 'bar' } });
  });

  it('toTab removes group prefix', () => {
    expect(toTab('/(tabs)/profile')).toBe('/profile');
  });
});

