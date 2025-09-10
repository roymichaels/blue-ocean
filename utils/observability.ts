import pino from 'pino';
import { collectDefaultMetrics, Counter, Histogram, register } from 'prom-client';
import type { IncomingMessage, ServerResponse } from 'http';

export const logger = pino();

if (typeof process?.cwd === 'function') {
  collectDefaultMetrics();
}

export const serviceLatency =
  typeof process?.cwd === 'function'
    ? new Histogram({
        name: 'service_latency_seconds',
        help: 'Service call latency in seconds',
        labelNames: ['service'],
      })
    : { startTimer: () => () => {} };

export const serviceFailures =
  typeof process?.cwd === 'function'
    ? new Counter({
        name: 'service_failures_total',
        help: 'Total number of service call failures',
        labelNames: ['service'],
      })
    : { inc: () => {} };

let metricsStarted = false;
export function startMetricsServer(
  port = Number(process.env.METRICS_PORT || 9464)
) {
  if (metricsStarted || typeof window !== 'undefined') return;
  const http = require('http');
  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  server.listen(port);
  metricsStarted = true;
}

if (typeof process?.cwd === 'function') {
  startMetricsServer();
}
