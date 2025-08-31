import { Redirect } from 'expo-router';

export default function CategoriesAlias() {
  // Web-safe alias so navigating to '/categories' mounts the Tabs group child
  return <Redirect href="/(tabs)/categories" />;
}

