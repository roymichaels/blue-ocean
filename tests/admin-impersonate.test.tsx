import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Impersonate from '@app/admin/stores/[storeId]/impersonate';
import { routes } from '@/utils/routes';

jest.mock('expo-router', () => {
  const router = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
  return {
    useLocalSearchParams: jest.fn(),
    useRouter: () => router,
    router,
  };
});

jest.mock('@/services/navigation', () => {
  const actual = jest.requireActual('@/services/navigation');
  return {
    ...actual,
    push: jest.fn(actual.push),
    replace: jest.fn(actual.replace),
  };
});

jest.mock('@/services', () => {
  const actual = jest.requireActual('@/services');
  return { ...actual, useRequirePlatformAdmin: jest.fn() };
});

describe('Admin store impersonation', () => {
  const { useLocalSearchParams } = require('expo-router');
  const navigation = require('@/services/navigation');
  const TAB_GROUP = '(' + 'tabs' + ')';

  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ storeId: 's1' });
    navigation.replace.mockClear();
  });

  it('redirects to store admin dashboard with impersonate flag', async () => {
    await act(async () => {
      renderer.create(React.createElement(Impersonate));
    });
    await act(async () => {});
    expect(navigation.replace).toHaveBeenCalledWith(
      routes.storeAdminDashboard('s1', true),
    );
    expect(navigation.replace.mock.calls[0][0]).not.toContain(TAB_GROUP);
  });
});
