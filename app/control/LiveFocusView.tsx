import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import { RoadmapProvider, useRoadmap } from '../../contexts/RoadmapContext';
import RoadmapService from '../../services/roadmap';
import type { RoadmapTask } from '../../types';
import { spacing, typography } from '../../constants/styles';

function LiveFocusInner() {
  const { activeRoadmap, tasks, completeTask, progress } = useRoadmap();
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
        {activeRoadmap?.title || 'No Active Roadmap'}
      </Text>
      <Text style={{ marginBottom: spacing.spacer16 }}>Progress: {Math.round(progress)}%</Text>
      {currentTask ? (
        <View style={{ marginBottom: spacing.spacer16 }}>
          <Text style={{ marginBottom: spacing.spacer8 }}>{currentTask.title}</Text>
          <Button title="Complete" onPress={handleComplete} />
        </View>
      ) : (
        <Text style={{ marginBottom: spacing.spacer16 }}>All tasks complete!</Text>
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
    <RoadmapProvider>
      <LiveFocusInner />
    </RoadmapProvider>
  );
}
