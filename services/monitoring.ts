import pino from 'pino';
import { LocalMetricRegistry } from '@/utils/localMetrics';

export const registry = new LocalMetricRegistry({ anonymizeLabels: true });
export const logger = pino({ name: 'monitoring' });

export const latencyHistogram = registry.createHistogram({
  name: 'service_latency_ms',
  help: 'Service call latency (ms)',
  labelNames: ['service'],
  anonymizeLabels: false,
});

export const failureCounter = registry.createCounter({
  name: 'service_failures_total',
  help: 'Service call failures',
  labelNames: ['service'],
  anonymizeLabels: false,
});

export const adminUnauthorizedAttempts = registry.createCounter({
  name: 'admin_unauthorized_attempts_total',
  help: 'Unauthorized admin actions',
});

export const adminCountGauge = registry.createGauge({
  name: 'admin_count',
  help: 'Number of registered admins',
});

export const cacheHydrationHistogram = registry.createHistogram({
  name: 'cache_hydration_ms',
  help: 'Time to hydrate cache (ms)',
  labelNames: ['cache'],
});

export const cacheHitRatioGauge = registry.createGauge({
  name: 'cache_hit_ratio',
  help: 'Cache hit ratio (hits/total)',
  labelNames: ['cache'],
});

export const authRateLimitCounter = registry.createCounter({
  name: 'auth_rate_limit_total',
  help: 'Number of auth requests rejected due to rate limiting',
});

export const authScopeRequestCounter = registry.createCounter({
  name: 'auth_scope_requests_total',
  help: 'Total auth scope requests',
});

export const authInvalidScopeCounter = registry.createCounter({
  name: 'auth_invalid_scope_total',
  help: 'Auth scope requests with invalid scopes',
});

export const checkoutTokenIntegrity = registry.createCounter({
  name: 'checkout_token_integrity_total',
  help: 'Checkout attempts grouped by token validity and success',
  labelNames: ['token_valid', 'success'],
  anonymizeLabels: false,
});

export async function withMonitoring<T>(
  service: string,
  fn: () => Promise<T>,
): Promise<T> {
  const timer = latencyHistogram.startTimer({ service });
  try {
    return await fn();
  } catch (err) {
    failureCounter.inc({ service });
    logger.error({ service, err }, 'service failure');
    throw err;
  } finally {
    timer({ service });
  }
}
