import { Redirect } from 'expo-router';
import useRequirePlatformAdmin from '../../hooks/useRequirePlatformAdmin';

export default function AdminIndex() {
  useRequirePlatformAdmin();
  return <Redirect href="/admin/overview" />;
}
