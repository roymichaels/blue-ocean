/*
 * Shared helpers for runtime polyfills.
 * These utilities keep the platform-specific entry points lean while
 * guaranteeing consistent behaviour across web and native targets.
 */
/* eslint-disable @typescript-eslint/no-var-requires */

import { sha512 } from '@noble/hashes/sha512';
import { etc as edUtils } from '@noble/ed25519';

export type GlobalLike = Record<string, unknown>;

export const ensureEd25519SyncHash = (): void => {
  if (!edUtils.sha512Sync) {
    edUtils.sha512Sync = sha512;
  }
};

export const ensureNodeLikeGlobals = (target: GlobalLike): void => {
  if (typeof target.Buffer === 'undefined') {
    target.Buffer = require('buffer').Buffer;
  }

  if (typeof target.process === 'undefined') {
    target.process = require('process');
  }
};

type EnsureTslibOptions = {
  onError?: (error: unknown) => void;
};

export const ensureTslibDefault = (
  moduleId: string,
  { onError }: EnsureTslibOptions = {},
): boolean => {
  try {
    const tslib = require(moduleId);

    if (tslib && !('default' in tslib)) {
      (tslib as Record<string, unknown>).default = tslib;
    }

    return true;
  } catch (error) {
    onError?.(error);
    return false;
  }
};

