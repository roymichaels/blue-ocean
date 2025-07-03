import { Buffer } from 'buffer';

export function randomBytes(length: number, cb?: (err: Error | null, buf: Buffer) => void) {
  const arr = new Uint8Array(length);
  if (typeof global.crypto !== 'undefined' && global.crypto.getRandomValues) {
    global.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  const buf = Buffer.from(arr);
  if (cb) {
    cb(null, buf);
    return;
  }
  return buf;
}

export const rng = randomBytes;
export const pseudoRandomBytes = randomBytes;
export const prng = randomBytes;
