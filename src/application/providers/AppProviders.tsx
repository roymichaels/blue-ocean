import React from 'react';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { AppModeProvider } from './AppModeProvider';
import { CommerceProvider } from './CommerceProvider';

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppModeProvider>
        <CommerceProvider>{children}</CommerceProvider>
      </AppModeProvider>
    </ThemeProvider>
  );
}

export default AppProviders;
