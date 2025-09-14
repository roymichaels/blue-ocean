import { failureCounter, latencyHistogram, withMonitoring } from '@/services/monitoring';

describe('monitoring hooks', () => {
  it('records latency and failures', async () => {
    const key = 'service:service:test,';
    const start = failureCounter.hashMap[key]?.value || 0;
    await expect(
      withMonitoring('service:test', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const end = failureCounter.hashMap[key]?.value || 0;
    expect(end).toBe(start + 1);
    const metric = latencyHistogram.hashMap[key];
    expect(metric).toBeDefined();
  });
});
