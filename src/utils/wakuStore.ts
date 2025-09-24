import { uuid } from './uuid';

/** Event code emitted when the replay queue grows beyond the threshold. */
export const E_BACKLOG = 'E_BACKLOG';

const drainedListeners = new Set<() => void>();

export function onDrained(cb: () => void): void {
  drainedListeners.add(cb);
}

export function offDrained(cb: () => void): void {
  drainedListeners.delete(cb);
}

// Default threshold before emitting the backlog event. Tests may override.
let backlogThreshold = 100;

type BacklogListener = (code: typeof E_BACKLOG) => void;
const backlogListeners = new Set<BacklogListener>();

export function onBacklog(cb: BacklogListener): void {
  backlogListeners.add(cb);
}

export function offBacklog(cb: BacklogListener): void {
  backlogListeners.delete(cb);
}

export function setBacklogThreshold(n: number): void {
  backlogThreshold = n;
}

function emitBacklog(): void {
  backlogListeners.forEach((cb) => cb(E_BACKLOG));
}

function emitDrained(): void {
  drainedListeners.forEach((cb) => cb());
}

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
  if (queue.length === backlogThreshold) emitBacklog();
  return id;
}

/** Flush queued messages using the provided send function. */
export async function flush(
  send: (topic: string, payload: Uint8Array) => Promise<void>,
): Promise<void> {
  let drained = false;
  while (queue.length > 0) {
    const msg = queue[0];
    try {
      await send(msg.topic, msg.payload);
      queue.shift();
      drained = true;
    } catch {
      // exit early; remaining messages stay queued
      break;
    }
  }
  if (drained && queue.length === 0) emitDrained();
}

/** Returns a snapshot of the current queue for debugging/testing. */
export function snapshot(): QueuedMessage[] {
  return [...queue];
}
