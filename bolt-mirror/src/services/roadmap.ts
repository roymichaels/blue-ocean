import { Roadmap, RoadmapTask } from '../types';

class RoadmapService {
  private static instance: RoadmapService;
  private roadmaps: Map<string, Roadmap> = new Map();
  private activeRoadmapId: string | null = null;

  public static getInstance(): RoadmapService {
    if (!RoadmapService.instance) {
      RoadmapService.instance = new RoadmapService();
    }
    return RoadmapService.instance;
  }

  addRoadmap(roadmap: Roadmap): void {
    this.roadmaps.set(roadmap.id, roadmap);
    if (roadmap.active) {
      this.setActiveRoadmap(roadmap.id);
    }
  }

  setActiveRoadmap(id: string): void {
    this.activeRoadmapId = id;
    // ensure exactly one active roadmap
    for (const [rid, rm] of this.roadmaps.entries()) {
      rm.active = rid === id;
      this.roadmaps.set(rid, rm);
    }
  }

  getActiveRoadmap(): Roadmap | null {
    if (!this.activeRoadmapId) return null;
    return this.roadmaps.get(this.activeRoadmapId) || null;
  }

  getRoadmap(id: string): Roadmap | null {
    return this.roadmaps.get(id) || null;
  }

  addTask(roadmapId: string, task: RoadmapTask): void {
    const rm = this.roadmaps.get(roadmapId);
    if (!rm) return;
    rm.tasks.push(task);
    this.roadmaps.set(roadmapId, rm);
  }

  completeTask(roadmapId: string, taskId: string): void {
    const rm = this.roadmaps.get(roadmapId);
    if (!rm) return;
    const t = rm.tasks.find(task => task.id === taskId);
    if (t) t.completed = true;
  }

  getTasks(roadmapId: string): RoadmapTask[] {
    return this.roadmaps.get(roadmapId)?.tasks || [];
  }

  getNextPendingTask(roadmapId: string): RoadmapTask | null {
    const rm = this.roadmaps.get(roadmapId);
    if (!rm) return null;
    const sorted = [...rm.tasks].sort((a, b) => a.order - b.order);
    return sorted.find(t => !t.completed) || null;
  }

  getProgress(roadmapId: string): number {
    const rm = this.roadmaps.get(roadmapId);
    if (!rm || rm.tasks.length === 0) return 0;
    const completed = rm.tasks.filter(t => t.completed).length;
    return (completed / rm.tasks.length) * 100;
  }
}

export default RoadmapService.getInstance();
