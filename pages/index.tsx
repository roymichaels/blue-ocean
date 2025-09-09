import React, { Suspense } from 'react';
import { ActivityIndicator, Button, Text, View } from 'react-native';

const HomeCards = React.lazy(() => import('../components/HomeCards'));

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View>
          <Text>Something went wrong.</Text>
          <Button title="Retry" onPress={() => this.setState({ hasError: false })} />
        </View>
      );
    }
    return this.props.children;
  }
}

export default function IndexPage() {
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const swUrl = new URL('service-worker.js', window.location.origin);
      navigator.serviceWorker.register(swUrl.toString()).catch(() => undefined);
    }
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<ActivityIndicator />}>
        <HomeCards />
      </Suspense>
    </ErrorBoundary>
  );
}
