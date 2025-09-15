import { Buffer } from 'buffer';
import { signMessage } from '@/features/auth/services/nearAuth';
import { requestScopes, validateToken, refreshToken, SessionToken } from '@/services/session';
import { uuid } from '@/utils/uuid';

const WORKSPACE_SCOPES = ['read', 'write'] as const;
export const DEFAULT_WORKSPACE_SESSION_TTL_MS = 60 * 60 * 1000;
const WORKSPACE_TOKEN_ERROR = '{E_WORKSPACE_TOKEN}';

interface WorkspaceTokenMeta {
  workspaceId: string;
  signature: string;
}

export interface WorkspaceSession extends SessionToken {
  workspaceId: string;
}

function generateWorkspaceId(): string {
  return `ws_${uuid().replace(/-/g, '').slice(0, 16)}`;
}

function encodeWorkspaceToken(meta: WorkspaceTokenMeta): string {
  const json = JSON.stringify(meta);
  const base64 = Buffer.from(json, 'utf8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function decodeWorkspaceToken(token: string): WorkspaceTokenMeta | null {
  try {
    let normalized = token.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4;
    if (pad) normalized += '='.repeat(4 - pad);
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    const meta = JSON.parse(json) as WorkspaceTokenMeta;
    if (
      !meta ||
      typeof meta.workspaceId !== 'string' ||
      meta.workspaceId.length === 0 ||
      typeof meta.signature !== 'string' ||
      meta.signature.length === 0
    ) {
      return null;
    }
    return meta;
  } catch {
    return null;
  }
}

async function signWorkspacePayload(workspaceId: string, payload: string): Promise<string> {
  const signature = await signMessage(payload);
  if (!signature) {
    throw new Error('{E_WORKSPACE_SIGN_FAILED}');
  }
  return encodeWorkspaceToken({ workspaceId, signature });
}

function requireWorkspaceMeta(token: string): WorkspaceTokenMeta {
  const meta = decodeWorkspaceToken(token);
  if (!meta) {
    throw new Error(WORKSPACE_TOKEN_ERROR);
  }
  return meta;
}

export async function createWorkspace(
  ttlMs = DEFAULT_WORKSPACE_SESSION_TTL_MS,
): Promise<WorkspaceSession> {
  const workspaceId = generateWorkspaceId();
  const session = await requestScopes(
    Array.from(WORKSPACE_SCOPES),
    (payload) => signWorkspacePayload(workspaceId, payload),
    ttlMs,
  );
  return { ...session, workspaceId };
}

export function validateWorkspaceSession(
  token: string,
  requiredScopes: readonly string[] = WORKSPACE_SCOPES,
): string {
  validateToken(token, Array.from(requiredScopes));
  return requireWorkspaceMeta(token).workspaceId;
}

export async function refreshWorkspaceSession(
  token: string,
  ttlMs = DEFAULT_WORKSPACE_SESSION_TTL_MS,
): Promise<WorkspaceSession> {
  const meta = requireWorkspaceMeta(token);
  const session = await refreshToken(
    token,
    (payload) => signWorkspacePayload(meta.workspaceId, payload),
    ttlMs,
  );
  return { ...session, workspaceId: meta.workspaceId };
}

export function getWorkspaceIdFromToken(token: string): string {
  return requireWorkspaceMeta(token).workspaceId;
}

export { WORKSPACE_SCOPES };
