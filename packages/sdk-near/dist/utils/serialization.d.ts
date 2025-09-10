/**
 * Serialize a value using canonical JSON encoding so that
 * equivalent objects produce the same string representation.
 */
export declare function serializeCanonical(value: unknown): string;
export declare const canonicalJson: typeof serializeCanonical;
export default serializeCanonical;
