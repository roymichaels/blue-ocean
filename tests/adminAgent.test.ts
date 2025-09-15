import { AdminAgent } from '../agents/admin-agent';
import { __clear } from './nearKvMock';
import { sign, getPublicKey, utils } from '@noble/ed25519';
import { canonicalJson } from '@/utils/serialization';
import type { WakuMessage } from '@/types/waku';
import {
  adminCountGauge,
  adminUnauthorizedAttempts,
} from '@/services/monitoring';
import '@/polyfills.web';

jest.mock('@/services/nearKvStore', () => require('./nearKvMock'));

async function createSignedMessage<T>(
  type: string,
  payload: T,
  priv: Uint8Array,
  pub: Uint8Array,
): Promise<WakuMessage<T>> {
  const message: WakuMessage<T> = {
    type,
    payload,
    sender: { publicKey: Buffer.from(pub).toString('hex') },
    signature: '',
  };
  const bytes = new TextEncoder().encode(
    canonicalJson({ type: message.type, payload, sender: message.sender }),
  );
  const sig = await sign(bytes, priv);
  message.signature = Buffer.from(sig).toString('hex');
  return message;
}

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
    const msg = await createSignedMessage('admin.request', { address: 'addr1' }, priv, pub);
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
    const first = await createSignedMessage('admin.request', { address: 'addr1' }, priv1, pub1);
    await agent.requestAdmin(first);

    // second request should be queued
    const priv2 = utils.randomPrivateKey();
    const pub2 = await getPublicKey(priv2);
    const second = await createSignedMessage('admin.request', { address: 'addr2' }, priv2, pub2);
    const event = new Promise((resolve) =>
      agent.once('admin.requested', resolve as any),
    );
    await agent.requestAdmin(second);
    await expect(event).resolves.toEqual({ address: 'addr2' });
    const pending = await agent.getPendingRequests();
    expect(pending).toHaveLength(1);
  });

  it('rejects admin requests with invalid signatures', async () => {
    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const msg = await createSignedMessage('admin.request', { address: 'addr1' }, priv, pub);
    // Corrupt signature
    msg.signature = '00';
    await expect(agent.requestAdmin(msg)).rejects.toMatchObject({
      code: 'E_SIGNATURE_INVALID',
    });
  });

  it('approves queued requests with existing admin', async () => {
    const priv1 = utils.randomPrivateKey();
    const pub1 = await getPublicKey(priv1);
    const first = await createSignedMessage('admin.request', { address: 'addr1' }, priv1, pub1);
    await agent.requestAdmin(first);

    const priv2 = utils.randomPrivateKey();
    const pub2 = await getPublicKey(priv2);
    const second = await createSignedMessage('admin.request', { address: 'addr2' }, priv2, pub2);
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

  it('rejects unauthorized approvals', async () => {
    const priv1 = utils.randomPrivateKey();
    const pub1 = await getPublicKey(priv1);
    const first = await createSignedMessage('admin.request', { address: 'addr1' }, priv1, pub1);
    await agent.requestAdmin(first);

    const priv2 = utils.randomPrivateKey();
    const pub2 = await getPublicKey(priv2);
    const second = await createSignedMessage('admin.request', { address: 'addr2' }, priv2, pub2);
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

  it('rejects approvals with bad signatures', async () => {
    const priv1 = utils.randomPrivateKey();
    const pub1 = await getPublicKey(priv1);
    const first = await createSignedMessage('admin.request', { address: 'addr1' }, priv1, pub1);
    await agent.requestAdmin(first);

    const priv2 = utils.randomPrivateKey();
    const pub2 = await getPublicKey(priv2);
    const second = await createSignedMessage('admin.request', { address: 'addr2' }, priv2, pub2);
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

  it('ignores replayed admin requests even with clock skew', async () => {
    jest.useFakeTimers();

    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const msg = await createSignedMessage('admin.request', { address: 'addr1' }, priv, pub);

    // initial request at time t
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    await agent.requestAdmin(msg);

    // replay the same signed message after significant time skew
    jest.setSystemTime(new Date('2024-01-01T01:00:00Z'));
    await agent.requestAdmin(msg);

    const admins = await agent.getAdmins();
    expect(admins).toHaveLength(1);
    const pending = await agent.getPendingRequests();
    expect(pending).toHaveLength(0);

    jest.useRealTimers();
  });
});
