import canonicalize from 'canonicalize';
/**
 * Serialize a value using canonical JSON encoding so that
 * equivalent objects produce the same string representation.
 */
export function serializeCanonical(value) {
    const result = canonicalize(value);
    return result ?? '';
}
export const canonicalJson = serializeCanonical;
export default serializeCanonical;
