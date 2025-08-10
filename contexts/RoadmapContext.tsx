import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Roadmap, RoadmapTask } from '../types';
import RoadmapService from '../services/roadmap';

interface RoadmapContextValue {
  activeRoadmap: Roadmap | null;
  tasks: RoadmapTask[];
  progress: number;
  setActiveRoadmap: (id: string) => void;
  completeTask: (taskId: string) => Promise<void>;
}

const RoadmapContext = createContext<RoadmapContextValue>({
  activeRoadmap: null,
  tasks: [],
  progress: 0,
  setActiveRoadmap: () => {},
  completeTask: async () => {},
});

export const RoadmapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRoadmap, setActiveRoadmapState] = useState<Roadmap | null>(
    RoadmapService.getActiveRoadmap()
  );
  const [tasks, setTasks] = useState<RoadmapTask[]>(
    activeRoadmap ? RoadmapService.getTasks(activeRoadmap.id) : []
  );

  const setActiveRoadmap = (id: string) => {
    RoadmapService.setActiveRoadmap(id);
    const rm = RoadmapService.getActiveRoadmap();
    setActiveRoadmapState(rm);
    setTasks(rm ? RoadmapService.getTasks(rm.id) : []);
  };

  const completeTask = async (taskId: string) => {
    if (!activeRoadmap) return;
    RoadmapService.completeTask(activeRoadmap.id, taskId);
    setTasks([...RoadmapService.getTasks(activeRoadmap.id)]);
  };

  useEffect(() => {
    const rm = RoadmapService.getActiveRoadmap();
    setActiveRoadmapState(rm);
    setTasks(rm ? RoadmapService.getTasks(rm.id) : []);
  }, []);

  const progress = activeRoadmap
    ? RoadmapService.getProgress(activeRoadmap.id)
    : 0;

  return (
    <RoadmapContext.Provider
      value={{ activeRoadmap, tasks, progress, setActiveRoadmap, completeTask }}
    >
      {children}
    </RoadmapContext.Provider>
  );
};

export const useRoadmap = () => useContext(RoadmapContext);
