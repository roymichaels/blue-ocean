import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';

const FILE_SCHEME = 'file://';
const CONTENT_SCHEME = 'content://';

type ExpoFsExtras = {
  EncodingType?: {
    Base64?: string;
    UTF8?: string;
  };
  cacheDirectory?: string;
  temporaryDirectory?: string;
};

const expoFs = FileSystem as typeof FileSystem & ExpoFsExtras;

function normalizeFileUri(uri: string): string {
  if (!uri) return uri;
  if (uri.startsWith(FILE_SCHEME) || uri.startsWith(CONTENT_SCHEME)) {
    return uri;
  }
  return `${FILE_SCHEME}${uri}`;
}

export function stripFileScheme(uri: string): string {
  return uri.startsWith(FILE_SCHEME) ? uri.slice(FILE_SCHEME.length) : uri;
}

async function tryExpoDelete(uri: string): Promise<boolean> {
  if (typeof FileSystem.deleteAsync !== 'function') {
    return false;
  }

  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch {
    return false;
  }
}

export async function deleteFile(
  uri: string,
  { allowContentScheme = false }: { allowContentScheme?: boolean } = {},
): Promise<void> {
  if (!uri) return;

  const expoUri = normalizeFileUri(uri);
  if (await tryExpoDelete(expoUri)) {
    return;
  }

  if (!allowContentScheme && expoUri.startsWith(CONTENT_SCHEME)) {
    return;
  }

  try {
    const fs = await import('fs/promises');
    await fs.unlink(stripFileScheme(expoUri));
  } catch {}
}

export async function readFileAsBuffer(uri: string): Promise<Buffer> {
  const expoUri = normalizeFileUri(uri);

  if (typeof FileSystem.readAsStringAsync === 'function') {
    const encoding = (expoFs.EncodingType?.Base64 ?? 'base64') as never;
    const base64 = await FileSystem.readAsStringAsync(expoUri, { encoding });
    return Buffer.from(base64, 'base64');
  }

  const fs = await import('fs/promises');
  const data = await fs.readFile(stripFileScheme(expoUri));
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

function randomSuffix(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toTempFileName(prefix: string, extension: string): string {
  const cleanExtension = extension.startsWith('.') ? extension : `.${extension}`;
  return `${prefix}-${randomSuffix()}${cleanExtension}`;
}

export async function writeTempFile(
  contents: string,
  { prefix = 'tmp', extension = 'tmp' }: { prefix?: string; extension?: string } = {},
): Promise<string> {
  const fileName = toTempFileName(prefix, extension);

  if (typeof FileSystem.writeAsStringAsync === 'function' && typeof expoFs.cacheDirectory === 'string') {
    const encoding = (expoFs.EncodingType?.UTF8 ?? 'utf8') as never;
    const path = `${expoFs.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(path, contents, { encoding });
    return path;
  }

  const fs = await import('fs/promises');
  const os = await import('os');
  const pathModule = await import('path');
  const filePath = pathModule.join(os.tmpdir(), fileName);
  await fs.writeFile(filePath, contents, 'utf8');
  return filePath;
}

function expoTempDirectories(): string[] {
  const dirs: string[] = [];
  if (typeof expoFs.cacheDirectory === 'string') {
    dirs.push(expoFs.cacheDirectory);
  }
  if (typeof expoFs.temporaryDirectory === 'string') {
    dirs.push(expoFs.temporaryDirectory);
  }
  return dirs;
}

function isExpoTemporaryUri(uri: string, dirs: string[] = expoTempDirectories()): boolean {
  if (!uri) return false;
  return dirs.some((dir) => uri.startsWith(dir));
}

export async function deleteIfTemporary(uri: string): Promise<void> {
  if (!uri) return;

  const expoDirs = expoTempDirectories();
  if (typeof FileSystem.deleteAsync === 'function' && expoDirs.length) {
    if (isExpoTemporaryUri(uri, expoDirs)) {
      await deleteFile(uri, { allowContentScheme: true });
    }
    return;
  }

  try {
    const os = await import('os');
    const tmpDir = os.tmpdir();
    const path = stripFileScheme(uri);
    if (!path.startsWith(tmpDir)) {
      return;
    }
    const fs = await import('fs/promises');
    await fs.unlink(path);
  } catch {}
}

export default {
  deleteFile,
  deleteIfTemporary,
  readFileAsBuffer,
  stripFileScheme,
  writeTempFile,
};
