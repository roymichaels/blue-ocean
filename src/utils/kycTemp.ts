import { deleteFile } from '@/utils/fileAccess';

const trackedPaths = new Set<string>();

function isTrackableUri(uri: string): boolean {
  if (!uri) return false;
  return uri.startsWith('file://') || uri.startsWith('/') || uri.startsWith('content://');
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
      await deleteFile(uri);
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

