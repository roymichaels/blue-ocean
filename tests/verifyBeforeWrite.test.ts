import { getPublicKey, sign, utils } from '@noble/ed25519';
import {
  verifyBeforeWrite,
  TIMESTAMP_TOLERANCE_MS,
} from '../utils/verifyMessageSignature';
import { wakuMessageSchema } from '../schemas/waku';
import { z } from 'zod';
import { canonicalJson } from '../utils/serialization';
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
      ts: Date.now(),
      nonce: 'nonce-allowed',
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

  it('enforces timestamp tolerance window', async () => {
    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const pubHex = Buffer.from(pub).toString('hex');

    const schema = wakuMessageSchema.extend({
      type: z.literal('test'),
      payload: z.object({ timestamp: z.number() }),
    });

    const makeMsg = async (ts: number) => {
      const msg: WakuMessage<{ timestamp: number }> = {
        type: 'test',
        payload: { timestamp: ts },
        sender: { publicKey: pubHex },
        signature: '',
        ts,
        nonce: `nonce-${ts}`,
      };
      const bytes = new TextEncoder().encode(
        canonicalJson({ type: msg.type, payload: msg.payload, sender: msg.sender }),
      );
      const sig = await sign(bytes, priv);
      msg.signature = Buffer.from(sig).toString('hex');
      return msg;
    };

    const within = await makeMsg(Date.now());
    await expect(verifyBeforeWrite(within, schema)).resolves.not.toBeNull();

    const future = await makeMsg(Date.now() + TIMESTAMP_TOLERANCE_MS + 1000);
    await expect(verifyBeforeWrite(future, schema)).resolves.toBeNull();
  });

  it('rejects duplicate nonces on the same topic', async () => {
    const priv = utils.randomPrivateKey();
    const pub = await getPublicKey(priv);
    const pubHex = Buffer.from(pub).toString('hex');
    const schema = wakuMessageSchema.extend({
      type: z.literal('test'),
      payload: z.string(),
    });
    const ts = Date.now();
    const msg: WakuMessage<string> = {
      type: 'test',
      payload: 'hello',
      sender: { publicKey: pubHex },
      signature: '',
      ts,
      nonce: 'replay-nonce',
    };
    const bytes = new TextEncoder().encode(
      canonicalJson({ type: msg.type, payload: msg.payload, sender: msg.sender }),
    );
    const sig = await sign(bytes, priv);
    msg.signature = Buffer.from(sig).toString('hex');
    await expect(verifyBeforeWrite(msg, schema, undefined, 'topic-1')).resolves.not.toBeNull();
    await expect(verifyBeforeWrite(msg, schema, undefined, 'topic-1')).resolves.toBeNull();
  });
});
