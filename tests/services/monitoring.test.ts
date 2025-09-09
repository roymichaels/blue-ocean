import { failureCounter, latencyHistogram, withMonitoring } from '@/services/monitoring';

describe('monitoring hooks', () => {
  it('records latency and failures', async () => {
    const startCount = failureCounter.hashMap['service:test']?.value || 0;
    await expect(
      withMonitoring('service:test', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const endCount = failureCounter.hashMap['service:test']?.value || 0;
    expect(endCount).toBe(startCount + 1);
    const metric = latencyHistogram.hashMap['service:test'];
    expect(metric).toBeDefined();
  });
});
