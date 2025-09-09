import canonicalize from 'canonicalize';

export function canonicalJson(value: unknown): string {
  // canonicalize returns undefined for unsupported inputs
  const result = canonicalize(value);
  return result ?? '';
}
