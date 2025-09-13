import pino from 'pino';
import type { IncomingMessage, ServerResponse } from 'http';
import type promClient from 'prom-client';

export const logger = pino();

let prom: typeof promClient | null = null;
if (typeof process?.cwd === 'function') {
  const pc: typeof promClient = require('prom-client');
  pc.collectDefaultMetrics();
  prom = pc;
}

export const serviceLatency =
  prom
    ? new prom.Histogram({
        name: 'service_latency_seconds',
        help: 'Service call latency in seconds',
        labelNames: ['service'],
      })
    : { startTimer: () => () => {} };

export const serviceFailures =
  prom
    ? new prom.Counter({
        name: 'service_failures_total',
        help: 'Total number of service call failures',
        labelNames: ['service'],
      })
    : { inc: () => {} };

let metricsStarted = false;
export function startMetricsServer(
  port = Number(process.env.METRICS_PORT || 9464)
) {
  // Do not start during tests or in the browser
  if (
    metricsStarted ||
    typeof window !== 'undefined' ||
    !prom ||
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID
  )
    return;
  const http = require('http');
  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', prom!.register.contentType);
      res.end(await prom!.register.metrics());
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  server.on('error', (err: any) => {
    // Avoid crashing tests if the port is already taken
    if (err && err.code === 'EADDRINUSE') return;
    throw err;
  });
  server.listen(port);
  metricsStarted = true;
}

if (prom) {
  startMetricsServer();
}
