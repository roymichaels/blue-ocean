import { AdminAgent } from '../agents/admin-agent';
import { __clear } from './nearKvMock';
import { sign, getPublicKey, utils } from '@noble/ed25519';
import { canonicalJson } from '@/utils/serialization';
import type { WakuMessage } from '@/types/waku';
import {
  adminCountGauge,
  adminUnauthorizedAttempts,
  logger as monitoringLogger,
} from '@/services/monitoring';
import '@/polyfills.web';

jest.mock('@/services/nearKvStore', () => require('./nearKvMock'));

async function createSignedMessage<T>(
  type: string,
  payload: T,
  priv: Uint8Array,
  pub: Uint8Array,
  meta?: { nonce?: string; ts?: number },
): Promise<WakuMessage<T & { nonce: string; ts: number }>> {
  const ts = meta?.ts ?? Date.now();
  const nonce =
    meta?.nonce ?? Buffer.from(utils.randomPrivateKey()).toString('hex');
  const message: WakuMessage<any> = {
    type,
    payload: {
      ...payload,
      nonce,
      ts,
    },
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

async function createJoinRequest(
  priv: Uint8Array,
  pub: Uint8Array,
  address: string,
  ts = Date.now(),
  nonce?: string,
) {
  return await createSignedMessage(
    'admin.joinRequested',
    { address },
    priv,
    pub,
    { ts, nonce },
  );
}

// TODO:TODO-127 Add regression cases for admin scope revocation to ensure pending approvals can't escalate permissions.
// TODO:REC-227 Mirror these tests against browser crypto polyfills to catch serialization drift.
describe('AdminAgent', () => {
  let agent: AdminAgent;

  beforeEach(() => {
    __clear();
    adminUnauthorizedAttempts.reset();
    adminCountGauge.set(0);
    agent = new AdminAgent();
  });

  it('registers first wallet as admin', async () => {
    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const msg = await createJoinRequest(priv, pub, 'addr1');
    const event = new Promise((resolve) =>
      agent.once('admin.registered', resolve as any),
    );
    await agent.requestAdmin(msg);
    await expect(event).resolves.toEqual({ address: 'addr1' });
    const admins = await agent.getAdmins();
    expect(admins).toHaveLength(1);
    expect(adminCountGauge.getValue()).toBe(1);
  });

  it('queues subsequent admin requests for approval', async () => {
    // seed first admin
    const priv1 = utils.randomPrivateKey();
    const pub1 = await getPublicKey(priv1);
    const first = await createJoinRequest(priv1, pub1, 'addr1');
    await agent.requestAdmin(first);

    // second request should be queued
    const priv2 = utils.randomPrivateKey();
    const pub2 = await getPublicKey(priv2);
    const second = await createJoinRequest(priv2, pub2, 'addr2', 1700000000000);
    const event = new Promise((resolve) =>
      agent.once('admin.requested', resolve as any),
    );
    await agent.requestAdmin(second);
    await expect(event).resolves.toEqual({
      address: 'addr2',
      requestedAt: 1700000000000,
    });
    const pending = await agent.getPendingRequests();
    expect(pending).toHaveLength(1);
  });

  it('rejects admin requests with invalid signatures', async () => {
    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const msg = await createJoinRequest(priv, pub, 'addr1');
    // Corrupt signature
    msg.signature = '00';
    await expect(agent.requestAdmin(msg)).rejects.toMatchObject({
      code: 'E_SIGNATURE_INVALID',
    });
  });

  it('rejects admin requests with excessive timestamp skew', async () => {
    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const oldTs = Date.now() - 10 * 60 * 1000;
    const msg = await createJoinRequest(priv, pub, 'addr1', oldTs);
    await expect(agent.requestAdmin(msg)).rejects.toMatchObject({
      code: 'E_REPLAY',
    });
  });

  it('approves queued requests with existing admin', async () => {
    const priv1 = utils.randomPrivateKey();
    const pub1 = await getPublicKey(priv1);
    const first = await createJoinRequest(priv1, pub1, 'addr1');
    await agent.requestAdmin(first);

    const priv2 = utils.randomPrivateKey();
    const pub2 = await getPublicKey(priv2);
    const second = await createJoinRequest(priv2, pub2, 'addr2');
    await agent.requestAdmin(second);

    const approve = await createSignedMessage(
      'admin.approve',
      { address: 'addr2' },
      priv1,
      pub1,
    );
    const event = new Promise((resolve) =>
      agent.once('admin.registered', resolve as any),
    );
    await agent.approveAdmin(approve);
    await expect(event).resolves.toEqual({ address: 'addr2' });
    const admins = await agent.getAdmins();
    expect(admins.map((a) => a.address)).toEqual(['addr1', 'addr2']);
    const pending = await agent.getPendingRequests();
    expect(pending).toHaveLength(0);
  });

  it('allows existing admin to reject pending requests', async () => {
    const priv1 = utils.randomPrivateKey();
    const pub1 = await getPublicKey(priv1);
    const first = await createJoinRequest(priv1, pub1, 'addr1');
    await agent.requestAdmin(first);

    const priv2 = utils.randomPrivateKey();
    const pub2 = await getPublicKey(priv2);
    const second = await createJoinRequest(priv2, pub2, 'addr2');
    await agent.requestAdmin(second);

    const reject = await createSignedMessage(
      'admin.reject',
      { address: 'addr2' },
      priv1,
      pub1,
    );
    const event = new Promise((resolve) =>
      agent.once('admin.rejected', resolve as any),
    );
    await agent.rejectAdmin(reject);
    await expect(event).resolves.toEqual({ address: 'addr2' });
    const pending = await agent.getPendingRequests();
    expect(pending).toHaveLength(0);
    const admins = await agent.getAdmins();
    expect(admins.map((a) => a.address)).toEqual(['addr1']);
  });

  it('rejects unauthorized approvals', async () => {
    const priv1 = utils.randomPrivateKey();
    const pub1 = await getPublicKey(priv1);
    const first = await createJoinRequest(priv1, pub1, 'addr1');
    await agent.requestAdmin(first);

    const priv2 = utils.randomPrivateKey();
    const pub2 = await getPublicKey(priv2);
    const second = await createJoinRequest(priv2, pub2, 'addr2');
    await agent.requestAdmin(second);

    // user3 tries to approve but is not admin
    const priv3 = utils.randomPrivateKey();
    const pub3 = await getPublicKey(priv3);
    const badApprove = await createSignedMessage(
      'admin.approve',
      { address: 'addr2' },
      priv3,
      pub3,
    );
    const start = adminUnauthorizedAttempts.getValue();
    await expect(agent.approveAdmin(badApprove)).rejects.toMatchObject({
      code: 'E_UNAUTHORIZED',
    });
    const end = adminUnauthorizedAttempts.getValue();
    expect(end).toBe(start + 1);
  });

  it('routes messages through handleMessage dispatcher', async () => {
    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const join = await createJoinRequest(priv, pub, 'addr-dispatch');
    await agent.handleMessage(join);
    const admins = await agent.getAdmins();
    expect(admins.map((a) => a.address)).toEqual(['addr-dispatch']);
  });

  it('rejects approvals with bad signatures', async () => {
    const priv1 = utils.randomPrivateKey();
    const pub1 = await getPublicKey(priv1);
    const first = await createJoinRequest(priv1, pub1, 'addr1');
    await agent.requestAdmin(first);

    const priv2 = utils.randomPrivateKey();
    const pub2 = await getPublicKey(priv2);
    const second = await createJoinRequest(priv2, pub2, 'addr2');
    await agent.requestAdmin(second);

    const wrongPriv = utils.randomPrivateKey();
    const approve = await createSignedMessage(
      'admin.approve',
      { address: 'addr2' },
      wrongPriv,
      pub1, // sender claims to be admin1 but signature is wrong
    );
    await expect(agent.approveAdmin(approve)).rejects.toMatchObject({
      code: 'E_SIGNATURE_INVALID',
    });
  });

  it('rejects replayed admin requests even with clock skew', async () => {
    jest.useFakeTimers();

    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const msg = await createJoinRequest(priv, pub, 'addr1');

    // initial request at time t
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    await agent.requestAdmin(msg);

    // replay the same signed message after significant time skew
    jest.setSystemTime(new Date('2024-01-01T01:00:00Z'));
    await expect(agent.requestAdmin(msg)).rejects.toMatchObject({
      code: 'E_REPLAY',
    });

    const admins = await agent.getAdmins();
    expect(admins).toHaveLength(1);
    const pending = await agent.getPendingRequests();
    expect(pending).toHaveLength(0);

    jest.useRealTimers();
  });

  it('rejects duplicate pending requests for the same address', async () => {
    const priv1 = utils.randomPrivateKey();
    const pub1 = await getPublicKey(priv1);
    await agent.requestAdmin(await createJoinRequest(priv1, pub1, 'addr1'));

    const priv2 = utils.randomPrivateKey();
    const pub2 = await getPublicKey(priv2);
    const request = await createJoinRequest(priv2, pub2, 'addr2', 123);
    await agent.requestAdmin(request);

    // replay same message -> E_REPLAY
    await expect(agent.requestAdmin(request)).rejects.toMatchObject({
      code: 'E_REPLAY',
    });

    // new nonce but same address -> E_DUPLICATE
    const replay = await createJoinRequest(priv2, pub2, 'addr2', 124);
    await expect(agent.requestAdmin(replay)).rejects.toMatchObject({
      code: 'E_DUPLICATE',
    });
  });

  it('alerts when unauthorized approvals exceed the threshold inside a minute', async () => {
    jest.useFakeTimers();
    const warnSpy = jest
      .spyOn(monitoringLogger, 'warn')
      .mockImplementation(() => undefined);

    try {
      jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

      const seedPriv = utils.randomPrivateKey();
      const seedPub = await getPublicKey(seedPriv);
      await agent.requestAdmin(
        await createJoinRequest(seedPriv, seedPub, 'seed-admin'),
      );

      const roguePriv = utils.randomPrivateKey();
      const roguePub = await getPublicKey(roguePriv);

      for (let i = 0; i < 4; i++) {
        const attempt = await createSignedMessage(
          'admin.approve',
          { address: `rogue-${i}` },
          roguePriv,
          roguePub,
        );
        await expect(agent.approveAdmin(attempt)).rejects.toMatchObject({
          code: 'E_UNAUTHORIZED',
        });
      }

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenLastCalledWith(
        {
          attempts: 4,
          windowMs: 60_000,
        },
        'admin unauthorized attempts threshold exceeded',
      );

      jest.setSystemTime(new Date('2024-01-01T00:02:00.000Z'));

      for (let i = 0; i < 4; i++) {
        const attempt = await createSignedMessage(
          'admin.approve',
          { address: `later-${i}` },
          roguePriv,
          roguePub,
        );
        await expect(agent.approveAdmin(attempt)).rejects.toMatchObject({
          code: 'E_UNAUTHORIZED',
        });
      }

      expect(warnSpy).toHaveBeenCalledTimes(2);
    } finally {
      warnSpy.mockRestore();
      jest.useRealTimers();
    }
  });
});
