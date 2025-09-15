import { failureCounter, latencyHistogram, withMonitoring } from '@/services/monitoring';

describe('monitoring hooks', () => {
  beforeEach(() => {
    failureCounter.reset();
    latencyHistogram.reset();
  });

  it('records latency and failures', async () => {
    const labels = { service: 'service:test' };
    const start = failureCounter.getValue(labels);
    await expect(
      withMonitoring('service:test', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const end = failureCounter.getValue(labels);
    expect(end).toBe(start + 1);
    const metric = latencyHistogram.getStats(labels);
    expect(metric?.count ?? 0).toBeGreaterThan(0);
  });
});
