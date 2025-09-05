import { Platform } from 'react-native';
import { shadows } from '@/ui/tokens';

type ShadowKey = keyof typeof shadows;

export function platformShadow(level: ShadowKey) {
  return shadows[level][Platform.OS];
}
