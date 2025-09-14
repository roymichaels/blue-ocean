import pino from 'pino';

// prom-client relies on Node-specific APIs like process.uptime which are not
// available in browser/React Native environments. Dynamically load it only when
// those APIs exist and otherwise fall back to no-op implementations.
let Counter: any;
let Histogram: any;
let Registry: any;
let Gauge: any;

if (
  typeof process !== 'undefined' &&
  typeof (process as any).uptime === 'function'
) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const promClient = require('prom-client');
  Counter = promClient.Counter;
  Histogram = promClient.Histogram;
  Registry = promClient.Registry;
  Gauge = promClient.Gauge;
} else {
  class NoopMetric {
    startTimer() {
      return () => {};
    }
    inc() {}
    set() {}
  }
  Counter = class extends NoopMetric {};
  Histogram = class extends NoopMetric {};
  Gauge = class extends NoopMetric {};
  Registry = class {};
}

export const registry = new Registry();
export const logger = pino();

export const latencyHistogram = new Histogram({
  name: 'service_latency_seconds',
  help: 'Service call latency',
  labelNames: ['service'],
  registers: [registry],
});

export const failureCounter = new Counter({
  name: 'service_failures_total',
  help: 'Service call failures',
  labelNames: ['service'],
  registers: [registry],
});

export const adminUnauthorizedAttempts = new Counter({
  name: 'admin_unauthorized_attempts_total',
  help: 'Unauthorized admin actions',
  registers: [registry],
});

export const adminCountGauge = new Gauge({
  name: 'admin_count',
  help: 'Number of registered admins',
  registers: [registry],
});

export async function withMonitoring<T>(
  service: string,
  fn: () => Promise<T>,
): Promise<T> {
  const end = latencyHistogram.startTimer({ service });
  try {
    return await fn();
  } catch (err) {
    failureCounter.inc({ service });
    logger.error({ service, err }, 'service failure');
    throw err;
  } finally {
    end();
  }
}
