import { stripTabsPrefix, push, replace } from '@/services/navigation';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

describe('navigation', () => {
  const { router } = require('expo-router');

  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
  });

  it('stripTabsPrefix removes group prefix', () => {
    // eslint-disable-next-line no-restricted-syntax
    expect(stripTabsPrefix('/(tabs)/profile')).toBe('/profile');
    expect(stripTabsPrefix('/profile')).toBe('/profile');
    expect(stripTabsPrefix(undefined)).toBeUndefined();
  });

  it('push strips group prefix before routing', () => {
    // eslint-disable-next-line no-restricted-syntax
    push('/(tabs)/orders');
    expect(router.push).toHaveBeenCalledWith('/orders');
  });

  it('replace strips group prefix in pathname objects', () => {
    // eslint-disable-next-line no-restricted-syntax
    replace({ pathname: '/(tabs)/orders', params: { foo: 'bar' } });
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/orders', params: { foo: 'bar' } });
  });
});
