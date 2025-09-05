import { Redirect, Stack } from 'expo-router';
import { useAppRouter } from '@/services';
import { StyleSheet, View } from 'react-native';
import Text from '@/ui/primitives/Text';
import Button from '@/ui/primitives/Button';
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
        <Button title={t('common.goHome')} onPress={() => replace('/')} />
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
});
