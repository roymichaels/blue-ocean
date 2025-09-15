import React, { Suspense, useMemo } from 'react';

import GadgetLabLayout from './components/GadgetLabLayout';
import GadgetTile from './components/GadgetTile';
import MetricCard from './components/MetricCard';
import QuickActions from './components/QuickActions';
import OfflineToast from './components/OfflineToast';
import InstallPromptBanner from './components/InstallPromptBanner';
import DeferredPanelFallback from './components/DeferredPanelFallback';
import { useDashboardData } from './hooks/useDashboardData';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePwaInstallPrompt } from './hooks/usePwaInstallPrompt';

const InsightGrid = React.lazy(() => import('./components/InsightGrid'));
const ActivityFeed = React.lazy(() => import('./components/ActivityFeed'));

const App: React.FC = () => {
  const { metrics, gadgets, events, quickActions, insights } = useDashboardData();
  const reduceMotion = usePrefersReducedMotion();
  const isOnline = useOnlineStatus();
  const installPrompt = usePwaInstallPrompt();

  const heroTiles = useMemo(
    () =>
      gadgets.slice(0, 3).map((gadget) => (
        <GadgetTile key={gadget.id} gadget={gadget} reduceMotion={reduceMotion} />
      )),
    [gadgets, reduceMotion],
  );

  return (
    <>
      <GadgetLabLayout
        title="Gadget Lab"
        subtitle="Offline-ready operations console"
        hero={<div className="lab-hero-grid">{heroTiles}</div>}
        sidebar={
          <Suspense fallback={<DeferredPanelFallback lines={3} />}>
            <InsightGrid insights={insights} reduceMotion={reduceMotion} />
          </Suspense>
        }
        actions={<QuickActions actions={quickActions} reduceMotion={reduceMotion} />}
      >
        <section className="lab-metrics-grid" aria-label="Live telemetry">
          {metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} reduceMotion={reduceMotion} />
          ))}
        </section>
        <section className="lab-activity" aria-label="Recent operations">
          <Suspense fallback={<DeferredPanelFallback lines={5} />}>
            <ActivityFeed events={events} />
          </Suspense>
        </section>
      </GadgetLabLayout>
      <OfflineToast offline={!isOnline} />
      {!installPrompt.isStandalone && installPrompt.canInstall ? (
        <InstallPromptBanner onInstall={installPrompt.promptInstall} />
      ) : null}
    </>
  );
};

export default App;
