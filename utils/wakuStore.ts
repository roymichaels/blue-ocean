import { uuid } from './uuid';

interface QueuedMessage {
  id: string;
  topic: string;
  payload: Uint8Array;
}

const queue: QueuedMessage[] = [];

/** Enqueue a message for later replay. Returns the generated message id. */
export function enqueue(topic: string, payload: Uint8Array): string {
  const id = uuid();
  queue.push({ id, topic, payload });
  return id;
}

/** Flush queued messages using the provided send function. */
export async function flush(
  send: (topic: string, payload: Uint8Array) => Promise<void>,
): Promise<void> {
  while (queue.length > 0) {
    const msg = queue[0];
    try {
      await send(msg.topic, msg.payload);
      queue.shift();
    } catch {
      // exit early; remaining messages stay queued
      break;
    }
  }
}

/** Returns a snapshot of the current queue for debugging/testing. */
export function snapshot(): QueuedMessage[] {
  return [...queue];
}
