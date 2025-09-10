import { useNotificationActions } from '@/components/NotificationContext';

export default function useToast() {
  const { showNotification } = useNotificationActions();

  return {
    show: showNotification,
    showError: (message: string, title = 'Error') =>
      showNotification(title, message, 'error'),
  };
}
