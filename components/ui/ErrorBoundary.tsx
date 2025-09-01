import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/constants/tokens';
import Button from './Button';
import { usePathname, router } from 'expo-router';
import { errorLog } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    errorLog('ErrorBoundary caught error:', error, info);
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  const pathname = usePathname();

  const handleRetry = () => {
    onRetry();
    try {
      router.replace(pathname);
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.text.primary }]}>Something went wrong</Text>
      <Text style={[styles.route, { color: colors.text.secondary }]}>Route: {pathname}</Text>
      <Button title="Retry" onPress={handleRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spacer16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.spacer8,
    textAlign: 'center',
  },
  route: {
    marginBottom: spacing.spacer16,
    textAlign: 'center',
  },
});

export default ErrorBoundary;
