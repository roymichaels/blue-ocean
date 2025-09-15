import AgentError from '@/types/AgentError';
import { publish, isWakuDisabled } from '@/services/waku';
import { buildTopic } from '@/utils/wakuTopics';
import { isDeliveryNotificationsEnabled } from '@/config/featureFlags';
import { makeSignedWakuMessage } from '@/utils/wakuSigning';
import { errorLog } from '@/utils/logger';
import { deliveryBacklog } from '@/utils/observability';
import { onBacklog, onDrained } from '@/utils/wakuStore';
import type { DeliveryJobStatus } from '@/types';

export const E_BACKLOG = 'E_BACKLOG';

const DELIVERY_TOPIC_DOMAIN = 'delivery';
type PauseReason = 'queue' | 'waku';

type OrderCreatedPayload = {
  orderId: string;
  storeId?: string;
};

type DeliveryAssignedPayload = {
  jobId: string;
  orderId: string;
  driverId?: string;
  status: DeliveryJobStatus;
  storeId?: string;
};

type QueueItem =
  | { type: 'order.created'; payload: OrderCreatedPayload; storeId: string; queuedAt: number }
  | { type: 'delivery.assigned'; payload: DeliveryAssignedPayload; storeId: string; queuedAt: number };

class DeliveryAgent {
  private backlog: QueueItem[] = [];
  private draining = false;
  private backlogLimit = 100;
  private pauseReasons = new Set<PauseReason>();

  constructor() {
    onBacklog(() => this.pause('waku'));
    onDrained(() => this.resume('waku'));
  }

  async handleOrderEvent(
    type: 'order.created',
    payload: OrderCreatedPayload,
  ): Promise<void> {
    this.enqueue(type, payload);
  }

  async handleDeliveryEvent(
    type: 'delivery.assigned',
    payload: DeliveryAssignedPayload,
  ): Promise<void> {
    this.enqueue(type, payload);
  }

  private enqueue(type: QueueItem['type'], payload: QueueItem['payload']): void {
    if (isWakuDisabled()) return;
    const storeId = payload.storeId || '1';
    if (!isDeliveryNotificationsEnabled(storeId)) return;
    if (this.backlog.length >= this.backlogLimit) {
      deliveryBacklog.set(this.backlog.length);
      this.pause('queue');
      errorLog('Delivery backlog limit exceeded', {
        size: this.backlog.length,
        limit: this.backlogLimit,
      });
      throw new AgentError(E_BACKLOG, 'Delivery backlog limit exceeded', 'delivery-agent');
    }
    const queuedAt = Date.now();
    let job: QueueItem;
    if (type === 'order.created') {
      const data: OrderCreatedPayload = { ...(payload as OrderCreatedPayload), storeId };
      job = { type, payload: data, storeId, queuedAt };
    } else {
      const data: DeliveryAssignedPayload = { ...(payload as DeliveryAssignedPayload), storeId };
      job = { type, payload: data, storeId, queuedAt };
    }
    this.backlog.push(job);
    deliveryBacklog.set(this.backlog.length);
    if (!this.draining && !this.shouldHaltProcessing()) {
      void this.drain();
    }
  }

  private async drain(): Promise<void> {
    if (this.draining || this.shouldHaltProcessing()) return;
    this.draining = true;
    while (this.backlog.length) {
      if (this.shouldHaltProcessing()) break;
      const job = this.backlog.shift()!;
      deliveryBacklog.set(this.backlog.length);
      try {
        await this.broadcast(job);
        if (this.pauseReasons.has('queue') && this.backlog.length < this.backlogLimit) {
          this.resume('queue');
        }
      } catch (err) {
        errorLog('Failed to broadcast delivery update', err);
      }
    }
    this.draining = false;
    if (!this.backlog.length) {
      this.resume('queue');
    }
  }

  private async broadcast(job: QueueItem): Promise<void> {
    const { type, payload, storeId } = job;
    const topic = buildTopic(DELIVERY_TOPIC_DOMAIN, storeId);
    const timestamp = Date.now();
    if (type === 'order.created') {
      const message = await makeSignedWakuMessage(
        'notify.deliveryUpdate',
        {
          event: type,
          orderId: payload.orderId,
          storeId,
          status: 'pending',
          timestamp,
        },
        'deliveries',
      );
      await publish(topic, message);
      return;
    }
    const assigned = payload as DeliveryAssignedPayload;
    const message = await makeSignedWakuMessage(
      'notify.deliveryUpdate',
      {
        event: type,
        orderId: assigned.orderId,
        storeId,
        jobId: assigned.jobId,
        driverId: assigned.driverId,
        status: assigned.status,
        timestamp,
      },
      'deliveries',
    );
    await publish(topic, message);
  }

  private pause(reason: PauseReason): void {
    this.pauseReasons.add(reason);
  }

  private resume(reason: PauseReason): void {
    if (!this.pauseReasons.has(reason)) return;
    this.pauseReasons.delete(reason);
    if (!this.shouldHaltProcessing() && this.backlog.length && !this.draining) {
      void this.drain();
    }
  }

  isPaused(): boolean {
    return this.pauseReasons.size > 0;
  }

  private shouldHaltProcessing(): boolean {
    return this.pauseReasons.size > 0 || this.backlog.length >= this.backlogLimit;
  }
}

export default new DeliveryAgent();
