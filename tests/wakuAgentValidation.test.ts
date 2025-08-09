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
