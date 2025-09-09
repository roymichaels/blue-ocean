import pino from 'pino';
import { Counter, Histogram, Registry } from 'prom-client';

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

export async function withMonitoring<T>(service: string, fn: () => Promise<T>): Promise<T> {
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
