describe('warm cache feature flag', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_WARM_CACHE;
    delete process.env.EXPO_PUBLIC_WARM_CACHE_CANARY_ADMINS;
    delete process.env.EXPO_PUBLIC_WARM_CACHE_ROLLBACK;
    jest.resetModules();
  });

  it('is disabled by default', () => {
    const { isWarmCacheEnabled } = require('@/config/featureFlags');
    expect(isWarmCacheEnabled('0x1')).toBe(false);
  });

  it('allows canary admins', () => {
    process.env.EXPO_PUBLIC_WARM_CACHE_CANARY_ADMINS = '0xabc,0xdef';
    jest.resetModules();
    const { isWarmCacheEnabled } = require('@/config/featureFlags');
    expect(isWarmCacheEnabled('0xAbC')).toBe(true);
    expect(isWarmCacheEnabled('0x123')).toBe(false);
  });

  it('rollback disables feature', () => {
    process.env.EXPO_PUBLIC_WARM_CACHE = 'true';
    jest.resetModules();
    const mod = require('@/config/featureFlags');
    expect(mod.isWarmCacheEnabled('0x1')).toBe(true);
    mod.triggerWarmCacheRollback();
    expect(mod.isWarmCacheEnabled('0x1')).toBe(false);
  });
});

describe('scoped tokens feature flag', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_SCOPED_TOKENS;
    delete process.env.EXPO_PUBLIC_SCOPED_TOKENS_WALLET_VENDORS;
    delete process.env.EXPO_PUBLIC_SCOPED_TOKENS_ROLLBACK;
    jest.resetModules();
  });

  it('is disabled by default', () => {
    const { isScopedTokensEnabled } = require('@/config/featureFlags');
    expect(isScopedTokensEnabled('near-wallet')).toBe(false);
  });

  it('allows canary wallet vendors', () => {
    process.env.EXPO_PUBLIC_SCOPED_TOKENS_WALLET_VENDORS = 'near-wallet,foo-wallet';
    jest.resetModules();
    const { isScopedTokensEnabled } = require('@/config/featureFlags');
    expect(isScopedTokensEnabled('near-wallet')).toBe(true);
    expect(isScopedTokensEnabled('bar-wallet')).toBe(false);
  });

  it('rollback disables feature', () => {
    process.env.EXPO_PUBLIC_SCOPED_TOKENS = 'true';
    jest.resetModules();
    const mod = require('@/config/featureFlags');
    expect(mod.isScopedTokensEnabled('near-wallet')).toBe(true);
    mod.triggerScopedTokensRollback();
    expect(mod.isScopedTokensEnabled('near-wallet')).toBe(false);
  });
});

describe('moonpay feature flag', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_FEATURE_MOONPAY;
    jest.resetModules();
  });

  it('is disabled by default', () => {
    const { isMoonPayEnabled } = require('@/config/featureFlags');
    expect(isMoonPayEnabled()).toBe(false);
  });

  it('respects environment flag', () => {
    process.env.EXPO_PUBLIC_FEATURE_MOONPAY = 'true';
    jest.resetModules();
    const { isMoonPayEnabled } = require('@/config/featureFlags');
    expect(isMoonPayEnabled()).toBe(true);
  });
});

describe('notifications pipeline feature flag', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_NOTIFICATIONS_PIPELINE;
    delete process.env.EXPO_PUBLIC_NOTIFICATIONS_PIPELINE_CANARY_USERS;
    delete process.env.EXPO_PUBLIC_NOTIFICATIONS_PIPELINE_ROLLBACK;
    jest.resetModules();
  });

  it('is disabled by default', () => {
    const { isNotificationsPipelineEnabled } = require('@/config/featureFlags');
    expect(isNotificationsPipelineEnabled('u1')).toBe(false);
  });

  it('allows canary users', () => {
    process.env.EXPO_PUBLIC_NOTIFICATIONS_PIPELINE_CANARY_USERS = 'u1,u2';
    jest.resetModules();
    const { isNotificationsPipelineEnabled } = require('@/config/featureFlags');
    expect(isNotificationsPipelineEnabled('u1')).toBe(true);
    expect(isNotificationsPipelineEnabled('u3')).toBe(false);
  });

  it('rollback disables feature', () => {
    process.env.EXPO_PUBLIC_NOTIFICATIONS_PIPELINE = 'true';
    jest.resetModules();
    const mod = require('@/config/featureFlags');
    expect(mod.isNotificationsPipelineEnabled('u1')).toBe(true);
    mod.triggerNotificationsPipelineRollback();
    expect(mod.isNotificationsPipelineEnabled('u1')).toBe(false);
  });
});
