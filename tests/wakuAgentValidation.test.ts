import WakuAgent from '../utils/wakuAgent';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';

interface TestItem { id: string; value: string }

let ed: any;

beforeAll(async () => {
  ed = await import('@noble/ed25519');
  ed.etc.sha512Sync = sha512;
});

test('rejects messages with invalid signature or role', async () => {
  const priv = ed.utils.randomPrivateKey();
  const pub = await ed.getPublicKeyAsync(priv);
  const pubHex = ed.etc.bytesToHex(pub);

  const agent = new WakuAgent<TestItem>(async () => {}, {
    allowedRoles: ['admin'],
    extractItem: (msg: any) => msg.item as TestItem,
  });

  const sender = { id: '1', publicKey: pubHex, role: 'admin' };
  const item = { id: 'x', value: '1' };
  const msg = { type: 'item.update', item, sender };
  const hash = sha256(new TextEncoder().encode(JSON.stringify(msg)));
  const signature = ed.etc.bytesToHex(await ed.signAsync(hash, priv));
  await agent.processPayload(JSON.stringify({ ...msg, signature }));

  // invalid role
  const badRole = { ...sender, role: 'user' };
  const badRoleMsg = { type: 'item.update', item: { id: 'y', value: '2' }, sender: badRole };
  const badRoleHash = sha256(new TextEncoder().encode(JSON.stringify(badRoleMsg)));
  const badRoleSig = ed.etc.bytesToHex(await ed.signAsync(badRoleHash, priv));
  await agent.processPayload(JSON.stringify({ ...badRoleMsg, signature: badRoleSig }));

  // invalid signature
  const badSigMsg = { type: 'item.update', item: { id: 'z', value: '3' }, sender };
  const badSigHash = sha256(new TextEncoder().encode(JSON.stringify(badSigMsg)));
  // sign with different key
  const otherPriv = ed.utils.randomPrivateKey();
  const badSig = ed.etc.bytesToHex(await ed.signAsync(badSigHash, otherPriv));
  await agent.processPayload(JSON.stringify({ ...badSigMsg, signature: badSig }));

  const all = agent.getAll();
  expect(all).toEqual([item]);
});

test('skips duplicate messages using hash cache', async () => {
  const priv = ed.utils.randomPrivateKey();
  const pub = await ed.getPublicKeyAsync(priv);
  const pubHex = ed.etc.bytesToHex(pub);

  const agent = new WakuAgent<TestItem>(async () => {}, {
    allowedRoles: ['admin'],
    extractItem: (msg: any) => msg.item as TestItem,
  });

  const sender = { id: '1', publicKey: pubHex, role: 'admin' };
  const item = { id: 'd', value: 'dup' };
  const msg = { type: 'item.update', item, sender };
  const hash = sha256(new TextEncoder().encode(JSON.stringify(msg)));
  const signature = ed.etc.bytesToHex(await ed.signAsync(hash, priv));
  const payload = JSON.stringify({ ...msg, signature });

  await agent.processPayload(payload);
  await agent.processPayload(payload); // duplicate

  const all = agent.getAll();
  expect(all).toHaveLength(1);
  expect(all[0]).toEqual(item);
});
