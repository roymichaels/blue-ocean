declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_ADMIN_USERNAME: string;
      EXPO_PUBLIC_MATRIX_SERVER: string;
      EXPO_PUBLIC_APP_NAME: string;
      EXPO_PUBLIC_DEBUG_LOGS?: string;
    }
  }
}

export {};