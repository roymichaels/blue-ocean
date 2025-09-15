import { Alert, Platform } from 'react-native';

export default function consentPrompt(scopes: string[]): Promise<boolean> {
  const msg = `Allow access to: ${scopes.join(', ')}?`;
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(msg));
      return;
    }
    Alert.alert('Permissions', msg, [
      { text: 'Deny', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Allow', onPress: () => resolve(true) },
    ]);
  });
}
