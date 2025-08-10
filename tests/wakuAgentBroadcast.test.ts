import WakuAgent from '../utils/wakuAgent';

interface TestItem {
  id: string;
  value: string;
}

test('broadcasts messages using provided send function', async () => {
  const sendFn = jest.fn().mockResolvedValue(undefined);
  const agent = new WakuAgent<TestItem>(sendFn, { requireSignature: false });
  const item = { id: 'b1', value: 'hello' };
  await agent.add(item);
  expect(sendFn).toHaveBeenCalledWith(item, false);
});

