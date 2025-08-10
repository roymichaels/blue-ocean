import WakuAgent from '../utils/wakuAgent';

interface TestItem { id: string; value: string }

test('accepts messages without sender or signature', async () => {
  const agent = new WakuAgent<TestItem>(async () => {}, {
    extractItem: (msg: any) => msg.item as TestItem,
    requireSignature: false,
  });

  const item = { id: 'x', value: '1' };
  const msg = { type: 'item.update', item };
  await agent.processPayload(JSON.stringify(msg));

  const all = agent.getAll();
  expect(all).toEqual([item]);
});

test('skips duplicate messages using hash cache', async () => {
  const agent = new WakuAgent<TestItem>(async () => {}, {
    extractItem: (msg: any) => msg.item as TestItem,
    requireSignature: false,
  });

  const item = { id: 'd', value: 'dup' };
  const payload = JSON.stringify({ type: 'item.update', item });

  await agent.processPayload(payload);
  await agent.processPayload(payload); // duplicate

  const all = agent.getAll();
  expect(all).toHaveLength(1);
  expect(all[0]).toEqual(item);
});

test('processes valid signed message when signature required', async () => {
  const TonWeb = (await import('tonweb')).default as any;
  const tonweb = new TonWeb();
  const keyPair = TonWeb.utils.nacl.sign.keyPair();
  const WalletClass = tonweb.wallet.all[tonweb.wallet.defaultVersion];
  const wallet = new WalletClass(tonweb.provider, {
    publicKey: keyPair.publicKey,
    wc: 0,
  });
  const address = (await wallet.getAddress()).toString(true, true, true);

  const item = { id: 's1', value: 'signed' };
  const unsigned = {
    type: 'item.update',
    item,
    sender: {
      publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
      address,
    },
  };
  const msgBytes = Buffer.from(JSON.stringify(unsigned), 'utf8');
  const signature = Buffer.from(
    TonWeb.utils.nacl.sign.detached(msgBytes, keyPair.secretKey),
  ).toString('base64');
  const payload = JSON.stringify({ ...unsigned, signature });

  const agent = new WakuAgent<TestItem>(async () => {}, {
    extractItem: (msg: any) => msg.item as TestItem,
  });

  await agent.processPayload(payload);
  expect(agent.getAll()).toEqual([item]);
});

test('rejects unsigned message when signature required', async () => {
  const agent = new WakuAgent<TestItem>(async () => {}, {
    extractItem: (msg: any) => msg.item as TestItem,
  });

  const item = { id: 'u1', value: 'unsigned' };
  const payload = JSON.stringify({ type: 'item.update', item });

  await agent.processPayload(payload);
  expect(agent.getAll()).toHaveLength(0);
});
