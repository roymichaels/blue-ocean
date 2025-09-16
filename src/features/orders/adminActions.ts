import { Alert } from 'react-native';
import type { Order } from '@/types';

type TranslateFn = (key: string, fallback: string) => string;

type AlertFn = typeof Alert.alert;

export interface PromptCancelOptions {
  order: Order; // reserved for future context (message customization)
  t: TranslateFn;
  onConfirm: () => void;
  alertFn?: AlertFn;
}

export function promptCancelOrder({
  t,
  onConfirm,
  alertFn = Alert.alert,
}: PromptCancelOptions): void {
  alertFn(
    t('orders.admin.cancelTitle', 'Cancel order'),
    t('orders.admin.cancelMessage', 'Are you sure you want to cancel this order?'),
    [
      { text: t('orders.admin.cancelReject', 'No'), style: 'cancel' },
      {
        text: t('orders.admin.cancelConfirm', 'Yes, cancel'),
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
  );
}

