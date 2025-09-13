import { Redirect, Stack } from 'expo-router';
import { useAppRouter } from '@/services';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { useLanguage } from '@/ui/ThemeProvider';

export default function NotFoundScreen() {
  const { replace } = useAppRouter();
  const { t } = useLanguage();
  if (__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: '404' }} />
      <View style={styles.container}>
        <Text style={styles.text}>{t('errors.pageNotFound')}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => replace('/')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{t('common.goHome')}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
