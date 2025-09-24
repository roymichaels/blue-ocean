jest.mock('@/services/waku', () => ({
  ensureNode: jest.fn(async () => null),
  isWakuDisabled: jest.fn(() => true),
  subscribeWithAck: jest.fn(async () => () => {}),
  fetchHistory: jest.fn(async () => undefined),
  publish: jest.fn(async () => 'mock-id'),
}));

jest.mock('@/providers/WalletProvider', () => {
  const React = require('react');
  return {
    __esModule: true,
    WalletProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@/contexts/WakuContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    WakuProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useWaku: () => ({
      subscribeNotifications: jest.fn(async () => () => {}),
    }),
  };
});

jest.mock('@/contexts/AppInfoContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    AppInfoProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useAppInfo: () => ({ themeColor: '#0055ff' }),
  };
});

jest.mock('@/contexts/ConfigContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    ConfigProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@/features/auth/AuthContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    AuthProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useAuth: () => ({ isLoggedIn: true, user: { id: 'user-1' } }),
  };
});

jest.mock('@/features/auth/AuthModalContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    AuthModalProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@/contexts/CurrencyContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    CurrencyProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@/features/launchGate', () => {
  const React = require('react');
  return {
    __esModule: true,
    LaunchGateProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@/ui/ThemeProvider', () => {
  const React = require('react');
  const colors = {
    status: { success: '#0f0', warning: '#ff0', error: '#f00', info: '#00f' },
    text: { inverse: '#fff', primary: '#111', secondary: '#666' },
    background: '#000',
    interactive: { primary: '#00f', primaryHover: '#00f' },
    border: { focus: '#00f' },
    tabBar: { active: '#00f' },
  };
  return {
    __esModule: true,
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    LanguageProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useTheme: () => ({
      theme: 'dark',
      colors,
      tokens: {},
      getColor: (path: string) => {
        switch (path) {
          case 'text.primary':
            return colors.text.primary;
          case 'text.secondary':
            return colors.text.secondary;
          case 'text.inverse':
            return colors.text.inverse;
          default:
            return '#000';
        }
      },
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
    }),
    useLanguage: () => ({
      t: (key: string, fallback?: string) => fallback ?? key,
      isRTL: false,
    }),
  };
});

jest.mock('@/features/notifications', () => ({
  useNotificationSubscription: () => ({
    unreadCount: 0,
    refreshNotifications: jest.fn(),
  }),
}));

jest.mock('@/services/notification', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      setLastOpenedNotificationId: jest.fn(),
      subscribeToUserNotifications: jest.fn(() => 'sub'),
      unsubscribeFromNotifications: jest.fn(),
    }),
  },
}));

jest.mock('@/services/eventBus', () => ({
  track: jest.fn(),
}));

jest.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/services/errorReporter', () => ({
  reportError: jest.fn(),
}));

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import AppProviders from '@/providers/AppProviders';

describe('AppProviders error notifications', () => {
  it('renders a notification popup when a descendant throws', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    let updateThrow: React.Dispatch<React.SetStateAction<boolean>> = () => {};

    function ThrowAfterReady({
      onReady,
    }: {
      onReady: (setter: React.Dispatch<React.SetStateAction<boolean>>) => void;
    }) {
      const [shouldThrow, setShouldThrow] = React.useState(false);

      React.useEffect(() => {
        onReady(setShouldThrow);
      }, [onReady]);

      if (shouldThrow) {
        throw new Error('Kaboom');
      }

      return React.createElement('Safe', null, 'safe');
    }

    await act(async () => {
      root.render(
        React.createElement(
          AppProviders,
          null,
          React.createElement(ThrowAfterReady, {
            onReady: (setter) => {
              updateThrow = setter;
            },
          }),
        ),
      );
    });

    // Allow NotificationProvider effects to register actions
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      updateThrow(true);
    });

    const headings = Array.from(document.body.querySelectorAll('Heading'));
    const notificationHeading = headings.find(
      (node) => node.textContent === 'Error',
    );
    expect(notificationHeading).toBeTruthy();
    expect(notificationHeading?.closest('TouchableOpacity')).not.toBeNull();

    const textNodes = Array.from(document.body.querySelectorAll('Text'));
    const messageNode = textNodes.find((node) => node.textContent === 'Kaboom');
    expect(messageNode?.closest('TouchableOpacity')).not.toBeNull();

    consoleErrorSpy.mockRestore();
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
