import { I18nManager } from 'react-native';

export function configureRTL(enable: boolean): void {
  if (I18nManager.isRTL !== enable) {
    I18nManager.allowRTL(enable);
    I18nManager.forceRTL(enable);
  }
}
