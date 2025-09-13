import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/ui/primitives/Text';
import Heading from '@/ui/primitives/Heading';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { t as i18nT } from '@/i18n';
import { spacing } from '@/shared/ui/tokens';
import Button from '@/ui/primitives/Button';
import { errorLog } from '@/utils/logger';

interface Props {
  children: ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
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
    this.props.onError?.(error, info);
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
  // Avoid hard dependency on LanguageProvider in tests; gracefully fall back
  // to the global i18n translator or key passthrough.
  let t: (key: string, opts?: any) => string = (k, opts) => i18nT(k, typeof opts === 'string' ? opts : k);
  try {
    if (typeof (useLanguage as unknown) === 'function') {
      const lang: any = (useLanguage as unknown as () => any)();
      if (lang && typeof lang.t === 'function') t = lang.t.bind(lang);
    }
  } catch {}
  const handleRetry = () => {
    onRetry();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Heading
        style={[styles.title, { color: colors.text.primary }]}
        size="lg"
      >
        {t('errors.somethingWentWrong')}
      </Heading>
      {error?.message && (
        <Text style={[styles.message, { color: colors.text.secondary }]}>{error.message}</Text>
      )}
      {/* Route information omitted when router context is unavailable */}
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
  title: { marginBottom: spacing.spacer8, textAlign: 'center' },
  message: { marginBottom: spacing.spacer8, textAlign: 'center' },
});

export default ErrorBoundary;
