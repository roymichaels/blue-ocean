import { publish } from '@/services/waku';
import { makeSignedWakuMessage } from '@/utils/wakuSigning';
import type { WakuMessage } from '@/types/waku';

const DM_TOPIC_PREFIX = '/blue-ocean/dm';

type SenderRole = 'buyer' | 'seller' | 'admin';

function dmTopic(recipientPublicKey: string): string {
  return `${DM_TOPIC_PREFIX}/${recipientPublicKey}`;
}

export async function sendDM<T>(
  recipientPublicKey: string,
  type: string,
  payload: T,
  role: SenderRole = 'buyer',
): Promise<WakuMessage<T>> {
  if (!recipientPublicKey) {
    throw new Error('recipient public key required');
  }
  const message = await makeSignedWakuMessage(type, payload, role);
  await publish(dmTopic(recipientPublicKey), message);
  return message;
}

export default { sendDM };
