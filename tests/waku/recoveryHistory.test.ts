import { AdminAgent } from '@/agents/admin-agent';
import { generateRecoveryCode } from '@/services/recoveryService';
import { __clear } from '../nearKvMock';
import { utils, getPublicKey, sign } from '@noble/ed25519';
import { canonicalJson } from '@/utils/serialization';
import type { WakuMessage } from '@/types/waku';
import { Buffer } from 'buffer';

jest.mock('@/services/nearKvStore', () => require('../nearKvMock'));

describe('Waku recovery history replay', () => {
  let agent: AdminAgent;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-02-01T00:00:00Z'));
    __clear();
    agent = new AdminAgent();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ignores duplicate admin.recovery.request messages with the same nonce', async () => {
    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const record = await generateRecoveryCode({
      tenantId: 'demo',
      targetPublicKey: Buffer.from(pub).toString('hex'),
      deviceId: 'device-dup',
    });

    const nonce = Buffer.from(utils.randomPrivateKey()).toString('hex');
    const payload = {
      tenantId: 'demo',
      codeId: record.id,
      code: record.code,
      deviceId: 'device-dup',
      nonce,
      ts: Date.now(),
    };
    const message: WakuMessage<typeof payload> = {
      type: 'admin.recovery.request',
      payload,
      sender: { publicKey: Buffer.from(pub).toString('hex') },
      signature: '',
      ts: payload.ts,
      nonce,
    };
    const bytes = new TextEncoder().encode(
      canonicalJson({ type: message.type, payload: message.payload, sender: message.sender }),
    );
    const sig = await sign(bytes, priv);
    message.signature = Buffer.from(sig).toString('hex');

    await expect(agent.handleMessage(message)).resolves.toBeUndefined();
    await expect(agent.handleMessage(message)).rejects.toMatchObject({ code: 'E_REPLAY' });
  });
});

