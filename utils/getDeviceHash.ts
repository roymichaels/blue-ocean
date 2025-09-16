import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

function resolveDeviceInfo(): string {
  const globalObject: any = typeof globalThis === 'undefined' ? undefined : globalThis;

  const override = globalObject?.__DEVICE_INFO__;
  if (override !== undefined && override !== null) {
    if (typeof override === 'string') return override;
    try {
      return JSON.stringify(override);
    } catch {
      return String(override);
    }
  }

  const navigatorInfo: any = globalObject?.navigator;
  if (navigatorInfo?.userAgent) {
    return navigatorInfo.userAgent;
  }

  if (typeof navigator !== 'undefined' && navigator?.userAgent) {
    return navigator.userAgent;
  }

  if (typeof process !== 'undefined' && process && typeof process === 'object') {
    const platform = (process as NodeJS.Process).platform ?? 'unknown';
    const arch = (process as NodeJS.Process).arch ?? 'unknown';
    return `${platform}-${arch}`;
  }

  return 'unknown-device';
}

export function getDeviceHash(): string {
  const info = resolveDeviceInfo();
  return bytesToHex(sha256(utf8ToBytes(info)));
}

export default getDeviceHash;
