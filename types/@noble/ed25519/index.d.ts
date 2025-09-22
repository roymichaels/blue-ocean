export const etc: {
  randomBytes: (bytes: number) => Uint8Array;
  sha512Sync?: (message: Uint8Array | string) => Uint8Array;
};
export function getPublicKey(secret: Uint8Array | string): Uint8Array;
