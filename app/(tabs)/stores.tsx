import React from 'react';
import { Card } from '@/ui/primitives';
import Text from '@/ui/primitives/Text';
import Button from '@/ui/primitives/Button';

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
