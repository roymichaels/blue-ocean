import pino from 'pino';
import { collectDefaultMetrics, Counter, Histogram, register } from 'prom-client';
import http from 'http';

export const logger = pino();

collectDefaultMetrics();

export const serviceLatency = new Histogram({
  name: 'service_latency_seconds',
  help: 'Service call latency in seconds',
  labelNames: ['service'],
});

export const serviceFailures = new Counter({
  name: 'service_failures_total',
  help: 'Total number of service call failures',
  labelNames: ['service'],
});

let metricsStarted = false;
export function startMetricsServer(port = Number(process.env.METRICS_PORT || 9464)) {
  if (metricsStarted || typeof window !== 'undefined') return;
  const server = http.createServer(async (req, res) => {
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

startMetricsServer();
