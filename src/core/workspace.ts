import { Buffer } from 'buffer';
import { signMessage, getPublicKey } from '@/features/auth/services/nearAuth';
import { connectWallet } from '@/auth/wallet';
import { publish, subscribeWithAck } from '@/services/waku';
import { requestScopes, validateToken, refreshToken, SessionToken } from '@/services/session';
import { canonicalJson } from '@/utils/serialization';
import { uuid } from '@/utils/uuid';
import { parseWorkspaceCreatedMessage } from '@/schemas/waku/workspace.created';
import type { WorkspaceCreatedMessage, WorkspaceCreatedPayload } from '@/types/waku';

const WORKSPACE_SCOPES = ['read', 'write'] as const;
export const DEFAULT_WORKSPACE_SESSION_TTL_MS = 60 * 60 * 1000;
export const WORKSPACE_HANDSHAKE_TIMEOUT_MS = 2000;

const WORKSPACE_TOPIC = '/blue-ocean/workspaces/1';
const WORKSPACE_ACK_TOPIC = `${WORKSPACE_TOPIC}/ack`;
const WORKSPACE_TOKEN_ERROR = '{E_WORKSPACE_TOKEN}';
const WORKSPACE_ACK_TIMEOUT_ERROR = '{E_WORKSPACE_ACK_TIMEOUT}';

interface WorkspaceTokenMeta {
  workspaceId: string;
  signature: string;
}

export interface WorkspaceSession extends SessionToken {
  workspaceId: string;
}

export type WorkspaceDiscoveryListener = (message: WorkspaceCreatedMessage) => void;

const workspaceListeners = new Set<WorkspaceDiscoveryListener>();
let workspaceSubscription: Promise<void> | null = null;
let workspaceUnsubscribe: (() => void) | null = null;

const pendingAcks = new Map<string, () => void>();
let ackSubscription: Promise<void> | null = null;

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
  await connectWallet();
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
  await connectWallet();
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

function emitWorkspaceDiscovered(message: WorkspaceCreatedMessage): void {
  if (!workspaceListeners.size) return;
  for (const listener of workspaceListeners) {
    try {
      listener(message);
    } catch {
      /* ignore listener errors */
    }
  }
}

async function ensureWorkspaceSubscription(): Promise<void> {
  if (workspaceSubscription) {
    await workspaceSubscription;
    return;
  }
  workspaceSubscription = (async () => {
    const unsubscribe = await subscribeWithAck(WORKSPACE_TOPIC, (raw) => {
      const parsed = parseWorkspaceCreatedMessage(raw);
      if (!parsed) return;
      emitWorkspaceDiscovered(parsed);
    });
    workspaceUnsubscribe = unsubscribe;
  })().catch((err) => {
    workspaceSubscription = null;
    throw err;
  });
  await workspaceSubscription;
}

async function ensureAckSubscription(): Promise<void> {
  if (ackSubscription) {
    await ackSubscription;
    return;
  }
  ackSubscription = (async () => {
    await subscribeWithAck(WORKSPACE_ACK_TOPIC, (ack: any) => {
      if (!ack || typeof ack.id !== 'string') return;
      const resolve = pendingAcks.get(ack.id);
      if (resolve) {
        resolve();
      }
    });
  })().catch((err) => {
    ackSubscription = null;
    throw err;
  });
  await ackSubscription;
}

function createAckWaiter(messageId: string): {
  promise: Promise<void>;
  cancel: () => void;
} {
  let settled = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const ackPromise = new Promise<void>((resolve) => {
    const resolver = () => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      pendingAcks.delete(messageId);
      resolve();
    };
    pendingAcks.set(messageId, resolver);
  });

  const timeoutPromise = new Promise<void>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      if (settled) return;
      settled = true;
      pendingAcks.delete(messageId);
      reject(new Error(WORKSPACE_ACK_TIMEOUT_ERROR));
    }, WORKSPACE_HANDSHAKE_TIMEOUT_MS);
  });

  return {
    promise: Promise.race([ackPromise, timeoutPromise]),
    cancel: () => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      pendingAcks.delete(messageId);
    },
  };
}

async function buildWorkspaceMessage(
  session: WorkspaceSession,
): Promise<WorkspaceCreatedMessage> {
  const payload: WorkspaceCreatedPayload = {
    workspaceId: session.workspaceId,
    session: session.token,
    timestamp: Date.now(),
  };
  const senderPublicKey = getPublicKey?.() ?? `workspace:${session.workspaceId}`;
  const message: WorkspaceCreatedMessage = {
    type: 'workspace.created',
    payload,
    sender: { publicKey: senderPublicKey, role: 'workspace' },
    signature: '',
  };
  const canonical = canonicalJson({
    type: message.type,
    payload: message.payload,
    sender: message.sender,
  });
  const signature = await signMessage(canonical);
  if (!signature) {
    throw new Error('{E_WORKSPACE_SIGN_FAILED}');
  }
  message.signature = signature;
  return message;
}

async function broadcastWorkspace(
  session: WorkspaceSession,
): Promise<WorkspaceCreatedMessage> {
  const message = await buildWorkspaceMessage(session);
  await ensureAckSubscription();
  const messageId = uuid();
  const waiter = createAckWaiter(messageId);
  try {
    await publish(WORKSPACE_TOPIC, { ...message, id: messageId });
  } catch (err) {
    waiter.cancel();
    throw err;
  }
  await waiter.promise;
  emitWorkspaceDiscovered(message);
  return message;
}

export async function provisionWorkspace(
  ttlMs = DEFAULT_WORKSPACE_SESSION_TTL_MS,
): Promise<WorkspaceSession> {
  const session = await createWorkspace(ttlMs);
  await broadcastWorkspace(session);
  return session;
}

export async function onWorkspaceDiscovered(
  listener: WorkspaceDiscoveryListener,
): Promise<() => void> {
  workspaceListeners.add(listener);
  try {
    await ensureWorkspaceSubscription();
  } catch (err) {
    workspaceListeners.delete(listener);
    throw err;
  }
  return () => {
    workspaceListeners.delete(listener);
    if (workspaceListeners.size === 0 && workspaceUnsubscribe) {
      workspaceUnsubscribe();
      workspaceUnsubscribe = null;
      workspaceSubscription = null;
    }
  };
}

export { WORKSPACE_SCOPES };
