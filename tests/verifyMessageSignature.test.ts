import { getPublicKey, sign, utils } from '@noble/ed25519';
import { verifyMessageSignature } from '../utils/verifyMessageSignature';
import type { WakuMessage } from '../types/waku';

describe('verifyMessageSignature', () => {
  it('accepts valid signatures and rejects invalid ones', async () => {
    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const pubHex = Buffer.from(pub).toString('hex');

    const msg: WakuMessage<string> = {
      type: 'test',
      payload: 'hello',
      sender: { publicKey: pubHex },
      signature: '',
    };
    const bytes = new TextEncoder().encode(
      JSON.stringify({ type: msg.type, payload: msg.payload, sender: msg.sender }),
    );
    const sig = await sign(bytes, priv);
    msg.signature = Buffer.from(sig).toString('hex');

    await expect(verifyMessageSignature(msg, pubHex)).resolves.toBe(true);

    const tampered = { ...msg, payload: 'bye' };
    await expect(verifyMessageSignature(tampered, pubHex)).resolves.toBe(false);
  });
});
