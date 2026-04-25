import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import type { JDOutput, ExperienceMap, SprintPlan, MockFeedback } from '@/lib/schemas';

interface StoredProgress {
  jdResult?: JDOutput | null;
  experienceResult?: ExperienceMap | null;
  sprintPlan?: SprintPlan | null;
  latestFeedback?: MockFeedback | null;
  taskCompletion?: Record<string, boolean>;
}

interface ProgressState {
  jdResult: JDOutput | null;
  experienceResult: ExperienceMap | null;
  sprintPlan: SprintPlan | null;
  latestFeedback: MockFeedback | null;
  taskCompletion: Record<string, boolean>;

  load: () => Promise<void>;
  setJdResult: (result: JDOutput | null) => Promise<void>;
  setExperienceResult: (result: ExperienceMap | null) => Promise<void>;
  setSprintPlan: (plan: SprintPlan | null) => Promise<void>;
  setLatestFeedback: (feedback: MockFeedback | null) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const STORAGE_KEY = 'careermvp_progress_v1';

const isStoredProgress = (val: unknown): val is StoredProgress => {
  return typeof val === 'object' && val !== null;
};

const persist = async (state: Partial<StoredProgress>) => {
  const raw = await idbGet(STORAGE_KEY);
  const current: StoredProgress = isStoredProgress(raw) ? raw : {};
  const next: StoredProgress = { ...current, ...state };
  await idbSet(STORAGE_KEY, next);
};

export const useProgressStore = create<ProgressState>((set, getState) => ({
  jdResult: null,
  experienceResult: null,
  sprintPlan: null,
  latestFeedback: null,
  taskCompletion: {},

  load: async () => {
    const raw = await idbGet(STORAGE_KEY);
    const saved: StoredProgress = isStoredProgress(raw) ? raw : {};
    set({
      jdResult: saved.jdResult ?? null,
      experienceResult: saved.experienceResult ?? null,
      sprintPlan: saved.sprintPlan ?? null,
      latestFeedback: saved.latestFeedback ?? null,
      taskCompletion: saved.taskCompletion ?? {},
    });
  },

  setJdResult: async (result) => {
    set({ jdResult: result });
    await persist({ jdResult: result });
  },

  setExperienceResult: async (result) => {
    set({ experienceResult: result });
    await persist({ experienceResult: result });
  },

  setSprintPlan: async (plan) => {
    set({ sprintPlan: plan });
    await persist({ sprintPlan: plan });
  },

  setLatestFeedback: async (feedback) => {
    set({ latestFeedback: feedback });
    await persist({ latestFeedback: feedback });
  },

  toggleTask: async (taskId) => {
    const next = {
      ...getState().taskCompletion,
      [taskId]: !getState().taskCompletion[taskId],
    };
    set({ taskCompletion: next });
    await persist({ taskCompletion: next });
  },

  clearAll: async () => {
    set({
      jdResult: null,
      experienceResult: null,
      sprintPlan: null,
      latestFeedback: null,
      taskCompletion: {},
    });
    await idbSet(STORAGE_KEY, {});
  },
}));
