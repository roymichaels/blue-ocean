import { Redirect, Stack } from 'expo-router';
import { replace } from '@/services/navigation';
import { StyleSheet, View } from 'react-native';
import Text from '@/ui/primitives/Text';
import Button from '@/ui/primitives/Button';

export default function NotFoundScreen() {
  if (__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: '404' }} />
      <View style={styles.container}>
        <Text style={styles.text}>404 - Page Not Found</Text>
        <Button title="Go Home" onPress={() => replace('/')} />
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
