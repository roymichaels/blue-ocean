import pino from 'pino';
import { LocalMetricRegistry } from './localMetrics';

export const logger = pino({ name: 'observability' });
const registry = new LocalMetricRegistry({ anonymizeLabels: true });

export const serviceLatency = registry.createHistogram({
  name: 'service_latency_ms',
  help: 'Service call latency in milliseconds',
  labelNames: ['service'],
  anonymizeLabels: false,
});

export const serviceFailures = registry.createCounter({
  name: 'service_failures_total',
  help: 'Service call failures recorded locally',
  labelNames: ['service'],
  anonymizeLabels: false,
});

export const adminTransactionIntegrity = registry.createCounter({
  name: 'admin_transaction_integrity_total',
  help: 'Admin transaction results',
  labelNames: ['action', 'result'],
  anonymizeLabels: false,
});

export const notificationsBacklog = registry.createGauge({
  name: 'notifications_backlog',
  help: 'Number of notifications pending delivery',
});

export const notificationDeliveryLatency = registry.createHistogram({
  name: 'notification_delivery_latency_ms',
  help: 'Notification delivery latency in milliseconds',
  labelNames: ['event'],
});

export function startMetricsServer(): void {
  logger.debug('Central metrics server disabled; metrics stay local.');
}

export function snapshotObservabilityMetrics() {
  return registry.snapshot();
}
