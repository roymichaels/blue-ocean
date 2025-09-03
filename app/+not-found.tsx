import { Redirect, Stack, router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotFoundScreen() {
  if (__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: '404' }} />
      <View style={styles.container}>
        <Text style={styles.text}>404 - Page Not Found</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={styles.link}>Go Home</Text>
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
  link: {
    marginTop: 20,
    fontSize: 16,
    color: '#007aff',
  },
});
