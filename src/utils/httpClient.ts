// Minimal HTTP client placeholder for non-Waku transport
export const Protocols = {} as any;
export async function createLightNode(_: any): Promise<null> {
  return null;
}
export async function waitForRemotePeer(_: any, __?: any): Promise<void> {}
export function createEncoder(_: any): any {
  return {};
}
export function createDecoder(_: any): any {
  return {};
}
export function utf8ToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  // Node.js
  return Buffer.from(str, 'utf8');
}
export function bytesToUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(bytes).toString('utf8');
}
