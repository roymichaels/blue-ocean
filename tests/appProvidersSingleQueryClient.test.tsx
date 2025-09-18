jest.mock('@/services/waku', () => ({
  ensureNode: jest.fn(async () => null),
  isWakuDisabled: jest.fn(() => true),
  subscribeWithAck: jest.fn(async () => () => {}),
  fetchHistory: jest.fn(async () => undefined),
  publish: jest.fn(async () => 'mock-id'),
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AppProviders from '@/providers/AppProviders';

// Test to ensure AppProviders mounts with a single CheckedQueryClientProvider
// and does not emit a duplicate provider error.
describe('AppProviders QueryClientProvider usage', () => {
  const originalDev = (globalThis as any).__DEV__;

  beforeEach(() => {
    (globalThis as any).__DEV__ = true;
  });

  afterEach(() => {
    (globalThis as any).__DEV__ = originalDev;
  });

  it('mounts without multiple QueryClientProvider error', () => {
    expect(() => {
      act(() => {
        const root = renderer.create(
          React.createElement(AppProviders, {}, null),
        );
        root.unmount();
      });
    }).not.toThrow();
  });

  it('throws when mounting two AppProviders simultaneously', () => {
    const roots: renderer.ReactTestRenderer[] = [];
    expect(() => {
      act(() => {
        roots.push(
          renderer.create(
            React.createElement(AppProviders, {}, null),
          ),
        );
        renderer.create(
          React.createElement(AppProviders, {}, null),
        );
      });
    }).toThrow('Multiple QueryClientProvider instances detected');

    act(() => {
      roots.forEach((r) => r.unmount());
    });
  });
});


