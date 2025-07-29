import { saveConfigValue } from '../utils/config';

beforeAll(async () => {
  await saveConfigValue(
    'EXPO_PUBLIC_JWT_SECRET',
    process.env.EXPO_PUBLIC_JWT_SECRET || 'test_jwt_secret',
  );
  await saveConfigValue(
    'EXPO_PUBLIC_CHAT_SECRET',
    process.env.EXPO_PUBLIC_CHAT_SECRET || 'test_chat_secret',
  );
  await saveConfigValue(
    'EXPO_PUBLIC_WAKU_SECRET',
    process.env.EXPO_PUBLIC_WAKU_SECRET || 'test_waku_secret',
  );
});
