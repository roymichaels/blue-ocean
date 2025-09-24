import * as FileSystem from 'expo-file-system';

const trackedPaths = new Set<string>();

function isTrackableUri(uri: string): boolean {
  if (!uri) return false;
  return uri.startsWith('file://') || uri.startsWith('/') || uri.startsWith('content://');
}

function toExpoUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }
  return `file://${uri}`;
}

function toFsPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

async function deleteUri(uri: string): Promise<void> {
  const expoUri = toExpoUri(uri);

  if (typeof FileSystem.deleteAsync === 'function') {
    try {
      await FileSystem.deleteAsync(expoUri, { idempotent: true });
      return;
    } catch {}
  }

  if (uri.startsWith('content://')) {
    return;
  }

  try {
    const fs = await import('fs/promises');
    await fs.unlink(toFsPath(uri));
  } catch {}
}

export function trackKycCapturedPath(uri?: string | null): void {
  if (!uri) return;
  if (!isTrackableUri(uri)) return;
  trackedPaths.add(uri);
}

export function untrackKycCapturedPath(uri?: string | null): void {
  if (!uri) return;
  trackedPaths.delete(uri);
}

export async function cleanupTrackedKycCapturedPaths(
  uris?: Iterable<string>,
): Promise<void> {
  const targets = new Set<string>();

  if (uris) {
    for (const uri of uris) {
      if (uri && trackedPaths.has(uri)) {
        targets.add(uri);
      }
    }
  } else {
    for (const uri of trackedPaths) {
      targets.add(uri);
    }
  }

  if (!targets.size) return;

  await Promise.all(
    [...targets].map(async (uri) => {
      await deleteUri(uri);
      trackedPaths.delete(uri);
    }),
  );
}

export function getTrackedKycCapturedPaths(): string[] {
  return [...trackedPaths];
}

export function resetTrackedKycCapturedPaths(): void {
  trackedPaths.clear();
}

