export async function requestConsent(scopes: string[]): Promise<boolean> {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const prompt = (await import('@/components/ConsentPrompt')).default;
  const ok = await prompt(scopes);
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const tti = end - start;
  if (tti > 2500) {
    console.warn(`[consent] prompt TTI ${Math.round(tti)}ms`);
  }
  return ok;
}
