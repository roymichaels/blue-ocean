export function getFeeBps(): number {
  const raw = process.env.FEE_BPS;
  const bps = raw ? Number(raw) : 100; // default 1%
  if (!Number.isFinite(bps) || bps < 0 || bps > 10000) {
    throw new Error('Invalid FEE_BPS');
  }
  return bps;
}

export function feeFromYocto(amountYocto: string, feeBps = getFeeBps()): string {
  const amt = BigInt(amountYocto);
  const fee = amt * BigInt(feeBps) / BigInt('10000');
  return fee.toString();
}

export default { getFeeBps, feeFromYocto };

