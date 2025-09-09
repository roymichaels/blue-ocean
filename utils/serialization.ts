import canonicalize from 'canonicalize';

export function serializeCanonical(value: unknown): string {
  const result = canonicalize(value);
  return result ?? '';
}

export const canonicalJson = serializeCanonical;

export default serializeCanonical;
