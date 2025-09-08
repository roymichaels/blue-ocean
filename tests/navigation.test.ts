/* eslint-disable no-restricted-syntax */
import { stripTabsPrefix, push, replace, toTab } from '@/services/navigation';
import { getTabsForAuth, consumerTabs, ownerTabs, adminTabs } from '@/config/navigation';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

describe('strip-tabs-prefix', () => {
  it('returns-undefined-for-nullish-values', () => {
    expect(stripTabsPrefix(undefined)).toBeUndefined();
    expect(stripTabsPrefix(null)).toBeUndefined();
  });

  it('leaves-path-unchanged-if-no-prefix', () => {
    expect(stripTabsPrefix('/profile')).toBe('/profile');
  });

  it('handles-nested-routes-and-query-strings', () => {
    expect(stripTabsPrefix('/orders/123?foo=bar')).toBe('/orders/123?foo=bar');
  });
});

describe('navigation-helpers', () => {
  const { router } = require('expo-router');

  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
  });

  it('push-forwards-path-before-routing', () => {
    push('/orders');
    expect(router.push).toHaveBeenCalledWith('/orders');
  });

  it('replace-uses-provided-pathname-objects', () => {
    replace({ pathname: '/orders', params: { foo: 'bar' } });
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/orders', params: { foo: 'bar' } });
  });

  it('totab-returns-same-path', () => {
    expect(toTab('/profile')).toBe('/profile');
  });
});

describe('get-tabs-for-auth', () => {
  it('returns-admin-tabs-for-admin-role', () => {
    expect(getTabsForAuth({ isAdmin: true })).toBe(adminTabs);
  });

  it('returns-owner-tabs-for-store-owner-role', () => {
    expect(getTabsForAuth({ isStoreOwner: true })).toBe(ownerTabs);
  });

  it('returns-consumer-tabs-by-default', () => {
    expect(getTabsForAuth({})).toBe(consumerTabs);
  });
});

