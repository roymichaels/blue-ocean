/**
 * Optional multi-factor check wrapper for sensitive admin actions.
 * If a verifier is provided, the action will only execute when the
 * verifier resolves to `true`.
 */
export async function withAdminMFA<T>(
  action: () => Promise<T>,
  verify?: () => Promise<boolean>,
): Promise<T> {
  if (verify) {
    const ok = await verify();
    if (!ok) {
      throw new Error('MFA verification failed');
    }
  }
  return action();
}

export default withAdminMFA;
