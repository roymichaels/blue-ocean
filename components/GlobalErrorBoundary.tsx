import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import notificationsAgent from '@/agents/notifications-agent';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class GlobalErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    notificationsAgent
      .trackAnalytics('app.error', {
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      })
      .catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>Please restart the app and try again.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
});
