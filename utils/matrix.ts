export function getSanitizedMatrixUrl(): string {
  const url = process.env.EXPO_PUBLIC_MATRIX_SERVER || '';
  // Remove protocol (http:// or https://)
  let sanitized = url.replace(/^https?:\/\//, '');
  // Remove trailing slashes
  sanitized = sanitized.replace(/\/+$/, '');
  return sanitized;
}
