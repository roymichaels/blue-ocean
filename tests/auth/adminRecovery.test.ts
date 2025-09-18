import { AdminAgent } from '@/agents/admin-agent';
import { generateRecoveryCode, getRecoveryCode } from '@/services/recoveryService';
import { __clear } from '../nearKvMock';
import { utils, getPublicKey, sign } from '@noble/ed25519';
import { canonicalJson } from '@/utils/serialization';
import type { WakuMessage } from '@/types/waku';
import { adminRecoveryTopic } from '@/utils/wakuTopics';
import { Buffer } from 'buffer';

jest.mock('@/services/nearKvStore', () => require('../nearKvMock'));

const mockPublish = jest.fn();
jest.mock('@/services/waku', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

async function createSignedMessage<T>(
  type: string,
  payload: T,
  priv: Uint8Array,
  pub: Uint8Array,
  meta?: { nonce?: string; ts?: number },
): Promise<WakuMessage<T & { nonce: string; ts: number }>> {
  const ts = meta?.ts ?? Date.now();
  const nonce = meta?.nonce ?? Buffer.from(utils.randomPrivateKey()).toString('hex');
  const message: WakuMessage<any> = {
    type,
    payload: { ...payload, nonce, ts },
    sender: { publicKey: Buffer.from(pub).toString('hex') },
    signature: '',
    ts,
    nonce,
  };
  const bytes = new TextEncoder().encode(
    canonicalJson({ type: message.type, payload: message.payload, sender: message.sender }),
  );
  const sig = await sign(bytes, priv);
  message.signature = Buffer.from(sig).toString('hex');
  return message;
}

describe('Admin recovery agent', () => {
  let agent: AdminAgent;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
    __clear();
    mockPublish.mockResolvedValue('id');
    mockPublish.mockClear();
    agent = new AdminAgent();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('generates and persists recovery codes', async () => {
    const record = await generateRecoveryCode({
      tenantId: 'tenant-a',
      targetPublicKey: 'pub',
      deviceId: 'device-x',
      approvalsRequired: 2,
    });
    const stored = await getRecoveryCode(record.id);
    expect(stored).not.toBeNull();
    expect(stored?.tenantId).toBe('tenant-a');
    expect(stored?.attempts).toBe(0);
  });

  it('processes a valid recovery request and publishes events', async () => {
    const requesterPriv = utils.randomPrivateKey();
    const requesterPub = await getPublicKey(requesterPriv);
    const code = await generateRecoveryCode({
      tenantId: 'demo',
      targetPublicKey: Buffer.from(requesterPub).toString('hex'),
      deviceId: 'device-123',
    });

    const msg = await createSignedMessage(
      'admin.recovery.request',
      {
        tenantId: 'demo',
        codeId: code.id,
        code: code.code,
        deviceId: 'device-123',
      },
      requesterPriv,
      requesterPub,
    );

    const once = new Promise((resolve) => agent.once('recovery.requested', resolve as any));
    await agent.requestRecovery(msg);
    await expect(once).resolves.toEqual({ tenantId: 'demo', codeId: code.id, deviceId: 'device-123' });
    expect(mockPublish).toHaveBeenCalledWith(
      adminRecoveryTopic('demo', 'request'),
      expect.objectContaining({ codeId: code.id, deviceId: 'device-123' }),
    );
  });

  it('locks a device after repeated failures', async () => {
    const requesterPriv = utils.randomPrivateKey();
    const requesterPub = await getPublicKey(requesterPriv);
    const code = await generateRecoveryCode({
      tenantId: 'demo',
      targetPublicKey: Buffer.from(requesterPub).toString('hex'),
      deviceId: 'device-bad',
    });

    const makeRequest = (overrideCode: string) =>
      createSignedMessage(
        'admin.recovery.request',
        {
          tenantId: 'demo',
          codeId: code.id,
          code: overrideCode,
          deviceId: 'device-bad',
        },
        requesterPriv,
        requesterPub,
      );

    for (let i = 0; i < 4; i += 1) {
      const badMsg = await makeRequest('wrong');
      await expect(agent.requestRecovery(badMsg)).rejects.toMatchObject({ code: 'E_RECOVERY_INVALID' });
    }
    const finalMsg = await makeRequest('wrong');
    await expect(agent.requestRecovery(finalMsg)).rejects.toMatchObject({ code: 'E_RATE_LIMIT' });
    expect(mockPublish).toHaveBeenCalledWith(
      adminRecoveryTopic('demo', 'attempt'),
      expect.objectContaining({ reason: 'locked' }),
    );
  });

  it('issues a grant after two unique admin approvals', async () => {
    const admin1Priv = utils.randomPrivateKey();
    const admin1Pub = await getPublicKey(admin1Priv);
    const admin2Priv = utils.randomPrivateKey();
    const admin2Pub = await getPublicKey(admin2Priv);
    const requesterPriv = utils.randomPrivateKey();
    const requesterPub = await getPublicKey(requesterPriv);

    const record = await generateRecoveryCode({
      tenantId: 'tenant',
      targetPublicKey: Buffer.from(requesterPub).toString('hex'),
      deviceId: 'device-321',
      approvalsRequired: 2,
    });

    await (agent as any).addAdmin({ address: 'admin1', publicKey: Buffer.from(admin1Pub).toString('hex') });
    await (agent as any).addAdmin({ address: 'admin2', publicKey: Buffer.from(admin2Pub).toString('hex') });

    const request = await createSignedMessage(
      'admin.recovery.request',
      { tenantId: 'tenant', codeId: record.id, code: record.code, deviceId: 'device-321' },
      requesterPriv,
      requesterPub,
    );
    await agent.requestRecovery(request);

    const verify = async (priv: Uint8Array, pub: Uint8Array) =>
      await createSignedMessage(
        'admin.recovery.verify',
        {
          tenantId: 'tenant',
          codeId: record.id,
          code: record.code,
          deviceId: 'device-321',
        },
        priv,
        pub,
      );

    const first = await verify(admin1Priv, admin1Pub);
    await agent.verifyRecovery(first);
    expect(mockPublish).not.toHaveBeenCalledWith(
      adminRecoveryTopic('tenant', 'granted'),
      expect.anything(),
    );

    const second = await verify(admin2Priv, admin2Pub);
    await agent.verifyRecovery(second);
    expect(mockPublish).toHaveBeenCalledWith(
      adminRecoveryTopic('tenant', 'granted'),
      expect.objectContaining({ codeId: record.id }),
    );
  });

  it('rejects replayed verify messages', async () => {
    const adminPriv = utils.randomPrivateKey();
    const adminPub = await getPublicKey(adminPriv);
    const requesterPriv = utils.randomPrivateKey();
    const requesterPub = await getPublicKey(requesterPriv);

    await agent['addAdmin']?.({ address: 'admin', publicKey: Buffer.from(adminPub).toString('hex') } as any);

    const code = await generateRecoveryCode({
      tenantId: 'tenant',
      targetPublicKey: Buffer.from(requesterPub).toString('hex'),
      deviceId: 'device-r',
      approvalsRequired: 1,
    });

    const request = await createSignedMessage(
      'admin.recovery.request',
      { tenantId: 'tenant', codeId: code.id, code: code.code, deviceId: 'device-r' },
      requesterPriv,
      requesterPub,
    );
    await agent.requestRecovery(request);

    const verify = await createSignedMessage(
      'admin.recovery.verify',
      { tenantId: 'tenant', codeId: code.id, code: code.code, deviceId: 'device-r' },
      adminPriv,
      adminPub,
    );
    await agent.verifyRecovery(verify);
    await expect(agent.verifyRecovery(verify)).rejects.toMatchObject({ code: 'E_REPLAY' });
  });
});


