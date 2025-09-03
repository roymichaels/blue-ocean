import React from 'react';
import { Card, Text, Button } from '@/ui/primitives';

import ErrorBoundary from '@/shared/ErrorBoundary';

export default function StoresScreen() {
  return (
    <ErrorBoundary>
      <Card>
        <Text>Stores Screen</Text>
        <Button title="Okay" onPress={() => {}} />
      </Card>
    </ErrorBoundary>

  );
}
