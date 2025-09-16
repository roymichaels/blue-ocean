import { createActionNonceGuard } from '@/features/orders/actionNonceGuard';

describe('order action nonce guard', () => {
  it('prevents duplicate acquires for the same id until release', () => {
    const guard = createActionNonceGuard();
    expect(guard.acquire('order-1')).toBe(true);
    expect(guard.isActive('order-1')).toBe(true);
    expect(guard.acquire('order-1')).toBe(false);
    guard.release('order-1');
    expect(guard.isActive('order-1')).toBe(false);
    expect(guard.acquire('order-1')).toBe(true);
  });

  it('allows different ids concurrently', () => {
    const guard = createActionNonceGuard();
    expect(guard.acquire('order-a')).toBe(true);
    expect(guard.acquire('order-b')).toBe(true);
    expect(guard.isActive('order-a')).toBe(true);
    expect(guard.isActive('order-b')).toBe(true);
    guard.release('order-a');
    expect(guard.isActive('order-a')).toBe(false);
    expect(guard.isActive('order-b')).toBe(true);
  });

  it('ignores blank identifiers', () => {
    const guard = createActionNonceGuard();
    expect(guard.acquire('')).toBe(false);
    expect(guard.acquire('   ')).toBe(false);
    expect(guard.isActive('')).toBe(false);
  });
});
