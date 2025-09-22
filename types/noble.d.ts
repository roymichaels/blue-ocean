declare module '@noble/hashes/sha512' {
  export function sha512(message: Uint8Array | string): Uint8Array;
}

declare module '@noble/ed25519' {
  export const etc: {
    randomBytes: (bytes: number) => Uint8Array;
  };
  export function getPublicKey(secret: Uint8Array | string): Uint8Array;
}
