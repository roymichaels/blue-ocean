import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Impersonate from '@app/admin/stores/[storeId]/impersonate';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: { replace: jest.fn() },
}));

jest.mock('@/services', () => {
  const { router } = require('expo-router');
  return {
    useRequirePlatformAdmin: jest.fn(),
    useAppRouter: () => ({ replace: router.replace, push: jest.fn(), back: jest.fn() }),
  };
});

describe('Admin store impersonation', () => {
  const { useLocalSearchParams, router } = require('expo-router');

  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ storeId: 's1' });
    router.replace.mockReset();
  });

  it('redirects to store admin dashboard with impersonate flag', async () => {
    await act(async () => {
      renderer.create(<Impersonate />);
    });
    await act(async () => {});
    expect(router.replace).toHaveBeenCalledWith('/store/s1/admin/dashboard?impersonate=true');
  });
});
