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
          React.createElement(AppProviders, {}, React.createElement(React.Fragment)),
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
            React.createElement(AppProviders, {}, React.createElement(React.Fragment)),
          ),
        );
        renderer.create(
          React.createElement(AppProviders, {}, React.createElement(React.Fragment)),
        );
      });
    }).toThrow('Multiple QueryClientProvider instances detected');

    act(() => {
      roots.forEach((r) => r.unmount());
    });
  });
});
