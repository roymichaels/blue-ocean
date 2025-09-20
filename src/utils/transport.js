import * as waku from '@waku/sdk';
export async function getClient() {
    return waku;
}
export default { getClient };
