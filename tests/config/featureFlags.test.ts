describe('rollout feature flag', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_FEATURE_ROLLOUT;
    delete process.env.EXPO_PUBLIC_FEATURE_ROLLOUT_CANARY_ADMINS;
    delete process.env.EXPO_PUBLIC_FEATURE_ROLLOUT_ROLLBACK;
    jest.resetModules();
  });

  it('is disabled by default', () => {
    const { isRolloutEnabled } = require('@/config/featureFlags');
    expect(isRolloutEnabled('0x1')).toBe(false);
  });

  it('allows canary admins', () => {
    process.env.EXPO_PUBLIC_FEATURE_ROLLOUT_CANARY_ADMINS = '0xabc,0xdef';
    jest.resetModules();
    const { isRolloutEnabled } = require('@/config/featureFlags');
    expect(isRolloutEnabled('0xAbC')).toBe(true);
    expect(isRolloutEnabled('0x123')).toBe(false);
  });

  it('rollback disables feature', () => {
    process.env.EXPO_PUBLIC_FEATURE_ROLLOUT = 'true';
    jest.resetModules();
    const mod = require('@/config/featureFlags');
    expect(mod.isRolloutEnabled('0x1')).toBe(true);
    mod.triggerRolloutRollback();
    expect(mod.isRolloutEnabled('0x1')).toBe(false);
  });
});
