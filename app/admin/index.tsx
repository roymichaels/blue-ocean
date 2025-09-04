import { Redirect } from 'expo-router';
import { useRequirePlatformAdmin } from '@/services';

export default function AdminIndex() {
  useRequirePlatformAdmin();
  return <Redirect href="/admin/overview" />;
}
