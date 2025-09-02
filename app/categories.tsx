import { Redirect } from 'expo-router';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

export default function CategoriesAlias() {
  // Web-safe alias so navigating to '/categories' mounts the Tabs group child
  return (
    <ErrorBoundary>
      <Redirect href="/categories" />
    </ErrorBoundary>
  );
}

