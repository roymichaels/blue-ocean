import * as waku from '@waku/sdk';

export async function getClient(): Promise<typeof waku> {
  return waku;
}

export default { getClient };
