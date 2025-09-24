import { gzipSync } from 'zlib';

export function gzipSize(bytes: Uint8Array): number {
  return gzipSync(Buffer.from(bytes)).length;
}
