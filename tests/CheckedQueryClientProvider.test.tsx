import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { QueryClient } from '@tanstack/react-query';
import { CheckedQueryClientProvider } from '@/providers/CheckedQueryClientProvider';

describe('CheckedQueryClientProvider', () => {
  const originalDev = (globalThis as any).__DEV__;

  beforeEach(() => {
    (globalThis as any).__DEV__ = true;
  });

  afterEach(() => {
    (globalThis as any).__DEV__ = originalDev;
  });

  it('throws when multiple instances mount', () => {
    let first: renderer.ReactTestRenderer;
    act(() => {
      first = renderer.create(
        React.createElement(
          CheckedQueryClientProvider,
          { client: new QueryClient() },
          React.createElement(React.Fragment),
        ),
      );
    });

    expect(() => {
      act(() => {
        renderer.create(
          React.createElement(
            CheckedQueryClientProvider,
            { client: new QueryClient() },
            React.createElement(React.Fragment),
          ),
        );
      });
    }).toThrow('Multiple QueryClientProvider instances detected');

    act(() => {
      first.unmount();
    });
  });
});
