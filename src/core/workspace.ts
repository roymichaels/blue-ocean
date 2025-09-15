import { sign } from '@noble/ed25519';
import { z } from 'zod';

import type { WorkspaceCreatedMessage } from '@/types/waku';
import { publish, subscribeWithAck } from '@/services/waku';
import { decrypt, encrypt } from '@/utils/wakuCrypto';
import { canonicalJson } from '@/utils/serialization';
import { parseWorkspaceCreatedMessage } from '@/schemas/waku/workspace.created';
import { getPrivateKey, getPublicKeyHex } from '@/services/localIdentity';
import type { SessionToken } from '@/services/session';

export const WORKSPACE_TOPIC = '/blue-ocean/workspaces/1';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const sessionSchema = z.object({
  token: z.string(),
  scopes: z.array(z.string()),
  exp: z.number(),
});

export type WorkspaceSessionMetadata = z.infer<typeof sessionSchema>;

export interface WorkspaceMetadata {
  workspaceId: string;
  session: WorkspaceSessionMetadata;
  timestamp: number;
}

function encodeSession(session: WorkspaceSessionMetadata): string {
  const bytes = encoder.encode(canonicalJson(session));
  const ciphertext = encrypt(WORKSPACE_TOPIC, bytes);
  return Buffer.from(ciphertext).toString('base64');
}

export function decodeWorkspaceSession(
  value: string,
): WorkspaceSessionMetadata | null {
  try {
    const raw = Uint8Array.from(Buffer.from(value, 'base64'));
    const decrypted = decrypt(WORKSPACE_TOPIC, raw);
    const parsed = JSON.parse(decoder.decode(decrypted));
    const result = sessionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

async function makeSignedMessage(
  payload: WorkspaceCreatedMessage['payload'],
): Promise<WorkspaceCreatedMessage> {
  const [privKey, pubKey] = await Promise.all([
    getPrivateKey(),
    getPublicKeyHex(),
  ]);
  const message: WorkspaceCreatedMessage = {
    type: 'workspace.created',
    payload,
    sender: { publicKey: pubKey, role: 'workspace' },
    signature: '',
  };
  const toSign = encoder.encode(
    canonicalJson({
      type: message.type,
      payload: message.payload,
      sender: message.sender,
    }),
  );
  const signature = await sign(toSign, privKey);
  message.signature = Buffer.from(signature).toString('hex');
  return message;
}

export async function broadcastWorkspaceMetadata(
  workspaceId: string,
  session: SessionToken,
  timestamp: number = Date.now(),
): Promise<string> {
  const payload: WorkspaceCreatedMessage['payload'] = {
    workspaceId,
    session: encodeSession(sessionSchema.parse(session)),
    timestamp,
  };
  const message = await makeSignedMessage(payload);
  return publish(WORKSPACE_TOPIC, message);
}

function toWorkspaceMetadata(
  message: WorkspaceCreatedMessage,
): WorkspaceMetadata | null {
  const session = decodeWorkspaceSession(message.payload.session);
  if (!session) return null;
  return {
    workspaceId: message.payload.workspaceId,
    session,
    timestamp: message.payload.timestamp,
  };
}

export type WorkspaceMetadataHandler = (
  metadata: WorkspaceMetadata,
  message: WorkspaceCreatedMessage,
) => void;

export async function subscribeToWorkspaceMetadata(
  handler: WorkspaceMetadataHandler,
): Promise<() => void> {
  return subscribeWithAck(WORKSPACE_TOPIC, (raw) => {
    const parsed = parseWorkspaceCreatedMessage(raw);
    if (!parsed) return;
    const metadata = toWorkspaceMetadata(parsed);
    if (!metadata) return;
    handler(metadata, parsed);
  });
}

export function toWorkspaceSession(
  message: WorkspaceCreatedMessage,
): WorkspaceSessionMetadata | null {
  return decodeWorkspaceSession(message.payload.session);
}

