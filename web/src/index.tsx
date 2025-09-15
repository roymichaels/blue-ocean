import React, { StrictMode, startTransition } from 'react';
import { createRoot } from 'react-dom/client';

import './styles.css';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { warmRuntimeCaches } from './pwa/cacheWarmup';
import { scheduleIdleTask } from './utils/scheduler';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Failed to find root container for the Gadget Lab PWA');
}

const root = createRoot(container);

const BootSplash: React.FC = () => (
  <div className="boot-splash" role="status" aria-live="polite">
    <div className="boot-splash__pulse" />
    <p>Launching Gadget Lab…</p>
  </div>
);

root.render(
  <StrictMode>
    <BootSplash />
  </StrictMode>,
);

const hydrate = () => {
  void import('./App').then(({ default: App }) => {
    startTransition(() => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    });
  });
};

const prepareApp = () => {
  hydrate();
  scheduleIdleTask(warmRuntimeCaches, 1500);
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  scheduleIdleTask(prepareApp, 1);
} else {
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      scheduleIdleTask(prepareApp, 1);
    },
    { once: true },
  );
}

registerServiceWorker();
