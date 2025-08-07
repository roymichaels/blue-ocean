import WakuAgent from '../utils/wakuAgent';

interface TestItem { id: string; value: string }

test('skips duplicate messages using hash cache', async () => {
  const agent = new WakuAgent<TestItem>(async () => {}, {
    extractItem: (msg: any) => msg.item as TestItem,
  });

  const item = { id: 'd', value: 'dup' };
  const payload = JSON.stringify({ type: 'item.update', item });

  await agent.processPayload(payload);
  await agent.processPayload(payload); // duplicate

  const all = agent.getAll();
  expect(all).toHaveLength(1);
  expect(all[0]).toEqual(item);
});
