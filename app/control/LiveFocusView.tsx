import React, { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import Text from '@/ui/primitives/Text';
import Button from '@/ui/primitives/Button';
import { RoadmapProvider, useRoadmap } from '../../contexts/RoadmapContext';
import RoadmapService from '@/services/roadmap';
import type { RoadmapTask } from '../../types';
import { spacing, typography } from '@/constants/styles';
import ErrorBoundary from '@/shared/ErrorBoundary';
import { useLanguage } from '@/ui/ThemeProvider';

function LiveFocusInner() {
  const { activeRoadmap, tasks, completeTask, progress } = useRoadmap();
  const { t } = useLanguage();
  const [currentTask, setCurrentTask] = useState<RoadmapTask | null>(null);

  useEffect(() => {
    if (activeRoadmap) {
      const next = RoadmapService.getNextPendingTask(activeRoadmap.id);
      setCurrentTask(next);
    } else {
      setCurrentTask(null);
    }
  }, [activeRoadmap, tasks]);

  const handleComplete = async () => {
    if (!activeRoadmap || !currentTask) return;
    await completeTask(currentTask.id);
    // query the next pending task (NEAR Lake-backed)
    const next = RoadmapService.getNextPendingTask(activeRoadmap.id);
    setCurrentTask(next);
  };

  return (
    <View style={{ padding: spacing.spacer16 }}>
      <Text style={[typography.heading1, { marginBottom: spacing.spacer8 }]}>
        {activeRoadmap?.title || t('control.noActiveRoadmap')}
      </Text>
      <Text style={{ marginBottom: spacing.spacer16 }}>
        {t('control.progress')} {Math.round(progress)}%
      </Text>
      {currentTask ? (
        <View style={{ marginBottom: spacing.spacer16 }}>
          <Text style={{ marginBottom: spacing.spacer8 }}>{currentTask.title}</Text>
          <Button title={t('control.complete')} onPress={handleComplete} />
        </View>
      ) : (
        <Text style={{ marginBottom: spacing.spacer16 }}>{t('control.allTasksComplete')}</Text>
      )}
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text
            style={{
              textDecorationLine: item.completed ? 'line-through' : 'none',
              marginBottom: spacing.spacer4,
            }}
          >
            {item.title}
          </Text>
        )}
      />
    </View>
  );
}

export default function LiveFocusView() {
  return (
    <ErrorBoundary>
      <RoadmapProvider>
        <LiveFocusInner />
      </RoadmapProvider>
    </ErrorBoundary>
  );
}
