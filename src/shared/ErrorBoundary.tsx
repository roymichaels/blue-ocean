import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/ui/primitives/Text';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { spacing } from '@/shared/ui/tokens';
import Button from '@/ui/primitives/Button';
import { usePathname } from 'expo-router';
import { useAppRouter } from '@/services';
import { errorLog } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    errorLog('EB', 'err', error, info);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(error.stack);
      // eslint-disable-next-line no-console
      console.error(info.componentStack);
    }
    this.setState({ error });
  }

  private reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onRetry }: { error?: Error; onRetry: () => void }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const pathname = usePathname();
  const { replace } = useAppRouter();

  const handleRetry = () => {
    onRetry();
    try {
      replace(pathname);
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.text.primary }]}>
        {t('errors.somethingWentWrong')}
      </Text>
      {error?.message && (
        <Text style={[styles.message, { color: colors.text.secondary }]}>{error.message}</Text>
      )}
      <Text style={[styles.route, { color: colors.text.secondary }]}>
        {t('common.route')} {pathname}
      </Text>
      <Button title={t('errors.tryAgain')} onPress={handleRetry} />
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
  message: {
    marginBottom: spacing.spacer8,
    textAlign: 'center',
  },
});

export default ErrorBoundary;
