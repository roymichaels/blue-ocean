import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] captured error', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ErrorFallback onRetry={this.reset} error={this.state.error} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onRetry, error }: { onRetry: () => void; error: Error }) {
  const { colors, typography } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={{ color: colors.text, fontSize: typography.heading, fontWeight: '600' }}>Something went wrong</Text>
      <Text style={{ color: colors.textMuted, fontSize: typography.body, textAlign: 'center' }} numberOfLines={4}>
        {error.message}
      </Text>
      <Text accessibilityRole="button" onPress={onRetry} style={{ color: colors.primary, fontWeight: '600' }}>
        Try again
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
});
