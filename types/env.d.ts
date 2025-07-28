declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_ADMIN_USERNAME: string;
      EXPO_PUBLIC_MATRIX_SERVER: string;
      EXPO_PUBLIC_APP_NAME: string;
      EXPO_PUBLIC_DEBUG_LOGS?: string;
      EXPO_PUBLIC_JWT_SECRET?: string;
      EXPO_PUBLIC_PINATA_JWT?: string;
      EXPO_PUBLIC_PINATA_API_KEY?: string;
      EXPO_PUBLIC_PINATA_SECRET_API_KEY?: string;
      EXPO_PUBLIC_CHAT_SECRET?: string;
      EXPO_PUBLIC_USE_WAKU?: string;
      EXPO_PUBLIC_WAKU_PRIVATE_KEY?: string;
      EXPO_PUBLIC_WAKU_PUBLIC_KEY?: string;
      VAPID_PUBLIC_KEY?: string;
      VAPID_PRIVATE_KEY?: string;
      EXPO_PUBLIC_TENANT?: string;
    }
  }
}

export {};
