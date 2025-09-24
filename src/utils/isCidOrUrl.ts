export function isCidOrUrl(uri: string): boolean {
  if (!uri) return false;

  // Check for valid HTTP(S) URLs
  try {
    const url = new URL(uri);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return true;
    }
  } catch {}

  // Remove ipfs:// prefix and extract path segment
  const cleaned = uri.replace(/^ipfs:\/\//, '').split('/')[0];

  // Basic CID pattern check (covers CIDv0 and v1)
  const cidPattern = /^[a-zA-Z0-9]{46,}$/;
  return cidPattern.test(cleaned);
}

export default isCidOrUrl;
