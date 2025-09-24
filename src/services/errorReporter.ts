import { track } from './eventBus';
import { errorLog } from '@/utils/logger';

type ErrorSeverity = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

interface NormalizedError {
  name?: string;
  message: string;
  stack?: string;
  cause?: string;
}

export interface ErrorMetadata {
  severity?: ErrorSeverity;
  componentStack?: string | null;
  context?: string;
  tags?: Record<string, string>;
  extras?: Record<string, unknown>;
  fingerprint?: string;
  isFatal?: boolean;
}

export interface ErrorReporterOptions {
  tags?: Record<string, string>;
  extras?: Record<string, unknown>;
}

const MAX_FIELD_LENGTH = 2000;
const MAX_SEEN_ERRORS = 128;

const seenErrors = new Map<string, number>();

const runtimeDetails = (() => {
  const globalObject: any = typeof globalThis !== 'undefined' ? globalThis : {};
  const navigatorInfo = globalObject.navigator as
    | { platform?: string; userAgent?: string }
    | undefined;
  const processInfo = globalObject.process as
    | { platform?: string; version?: string; release?: { name?: string } }
    | undefined;

  const platform = navigatorInfo?.platform || processInfo?.platform || 'unknown';
  const runtime = navigatorInfo?.userAgent ||
    (processInfo?.release?.name
      ? `${processInfo.release.name}${processInfo.version ? `@${processInfo.version}` : ''}`
      : 'unknown');

  return { platform, runtime };
})();

function truncate(value?: string | null, max = MAX_FIELD_LENGTH): string | undefined {
  if (!value) return undefined;
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function safeSerialize(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return {
      name: error.name,
      message: error.message || error.toString(),
      stack: error.stack ? truncate(error.stack) : undefined,
      cause: cause instanceof Error ? `${cause.name}: ${cause.message}` : truncate(typeof cause === 'string' ? cause : cause ? safeSerialize(cause) : undefined),
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    const message = typeof errObj.message === 'string' ? errObj.message : safeSerialize(errObj);
    const stack = typeof errObj.stack === 'string' ? truncate(errObj.stack) : undefined;
    const name = typeof errObj.name === 'string' ? errObj.name : undefined;
    return { name, message, stack };
  }

  return { message: safeSerialize(error) };
}

function buildFingerprint(normalized: NormalizedError, metadata: ErrorMetadata): string {
  if (metadata.fingerprint) return metadata.fingerprint;
  return [normalized.name, normalized.message, metadata.context, normalized.stack, metadata.componentStack]
    .filter(Boolean)
    .join('|');
}

function registerOccurrence(fingerprint: string): number {
  const nextCount = (seenErrors.get(fingerprint) ?? 0) + 1;
  seenErrors.set(fingerprint, nextCount);
  if (seenErrors.size > MAX_SEEN_ERRORS) {
    const oldest = seenErrors.keys().next();
    if (!oldest.done) {
      seenErrors.delete(oldest.value);
    }
  }
  return nextCount;
}

export async function reportError(
  error: unknown,
  metadata: ErrorMetadata = {},
): Promise<void> {
  const normalized = normalizeError(error);
  const fingerprint = buildFingerprint(normalized, metadata);
  const occurrence = registerOccurrence(fingerprint);
  const severity: ErrorSeverity = metadata.severity
    ? metadata.severity
    : metadata.isFatal
    ? 'fatal'
    : 'error';

  const payload: Record<string, unknown> = {
    ...runtimeDetails,
    severity,
    message: normalized.message,
    name: normalized.name,
    stack: truncate(normalized.stack),
    cause: truncate(normalized.cause),
    componentStack: truncate(metadata.componentStack),
    context: metadata.context,
    occurrence,
    isFatal: metadata.isFatal ?? severity === 'fatal',
    timestamp: Date.now(),
  };

  if (metadata.tags && Object.keys(metadata.tags).length > 0) {
    payload.tags = metadata.tags;
  }
  if (metadata.extras && Object.keys(metadata.extras).length > 0) {
    payload.extras = metadata.extras;
  }

  errorLog('Captured application error', {
    message: normalized.message,
    context: metadata.context,
    severity,
    occurrence,
  });

  try {
    await track('app.error', payload);
  } catch (err) {
    errorLog('Failed to publish error event', err);
  }
}

export function initErrorReporter(options: ErrorReporterOptions = {}): () => void {
  const disposers: Array<() => void> = [];
  const defaultTags = options.tags ?? {};
  const defaultExtras = options.extras ?? {};

  const handleError = (err: unknown, context: string, isFatal?: boolean) => {
    void reportError(err, {
      context,
      tags: defaultTags,
      extras: defaultExtras,
      isFatal,
      severity: isFatal ? 'fatal' : undefined,
    });
  };

  const globalObject: any = typeof globalThis !== 'undefined' ? globalThis : {};
  const errorUtils = globalObject?.ErrorUtils;

  if (errorUtils && typeof errorUtils.setGlobalHandler === 'function') {
    const previousHandler =
      typeof errorUtils.getGlobalHandler === 'function'
        ? errorUtils.getGlobalHandler()
        : errorUtils._globalHandler;

    const globalHandler = (error: unknown, isFatal?: boolean) => {
      handleError(error, 'global-handler', isFatal);
      if (typeof previousHandler === 'function') {
        try {
          previousHandler(error, isFatal);
        } catch (err) {
          errorLog('Previous global error handler threw', err);
        }
      }
    };

    errorUtils.setGlobalHandler(globalHandler);

    disposers.push(() => {
      if (typeof errorUtils.setGlobalHandler === 'function') {
        if (previousHandler) {
          errorUtils.setGlobalHandler(previousHandler);
        } else {
          errorUtils.setGlobalHandler(globalHandler);
        }
      }
    });
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    const onWindowError = (event: any) => {
      const error = event?.error ?? event?.message;
      handleError(error, 'window.error', true);
    };
    const onUnhandledRejection = (event: any) => {
      handleError(event?.reason, 'window.unhandledrejection', false);
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    disposers.push(() => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    });
  }

  return () => {
    while (disposers.length > 0) {
      const dispose = disposers.pop();
      try {
        dispose?.();
      } catch (err) {
        errorLog('Error reporter cleanup failed', err);
      }
    }
  };
}
