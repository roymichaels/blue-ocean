import { getPublicKey, sign, utils } from '@noble/ed25519';
import { verifyBeforeWrite } from '../utils/verifyBeforeWrite';
import { wakuMessageSchema } from '../schemas/waku';
import { z } from 'zod';
import { canonicalJson } from '../utils/canonicalJson';
import type { WakuMessage } from '../types/waku';

describe('verifyBeforeWrite', () => {
  it('respects allowed public keys', async () => {
    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const pubHex = Buffer.from(pub).toString('hex');

    const msg: WakuMessage<string> = {
      type: 'test',
      payload: 'hi',
      sender: { publicKey: pubHex },
      signature: '',
    };
    const bytes = new TextEncoder().encode(
      canonicalJson({ type: msg.type, payload: msg.payload, sender: msg.sender }),
    );
    const sig = await sign(bytes, priv);
    msg.signature = Buffer.from(sig).toString('hex');

    const schema = wakuMessageSchema.extend({ type: z.literal('test'), payload: z.string() });

    await expect(verifyBeforeWrite(msg, schema, [pubHex])).resolves.not.toBeNull();
    await expect(
      verifyBeforeWrite(msg, schema, ['deadbeef']),
    ).resolves.toBeNull();
  });
});
