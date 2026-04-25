import type {
  RawJDInput,
  RawExperienceInput,
  UserPreferences,
  JDOutput,
  ExperienceMap,
  AggregatedJDProfile,
  GapAnalysisResult,
  PersonalizedSprintPlan,
  OptimizedSprintPlan,
  SprintPlan,
  GapReport,
} from '@/lib/schemas';

export const WORKFLOW_STAGES = [
  {
    id: 1,
    name: 'JD聚合与提炼',
    description: '分析多个 JD，提取共同要求和差异点',
    produces: 'aggregatedProfile',
    requiredInputs: ['rawJDs'],
    optionalInputs: ['existingJdResults'],
    llmCallsMin: 1,
    llmCallsMax: 3,
  },
  {
    id: 2,
    name: '能力差距分析',
    description: '匹配用户经历与岗位要求，量化差距',
    produces: 'gapAnalysis',
    requiredInputs: ['aggregatedProfile'],
    optionalInputs: ['rawExperiences', 'existingExperienceResults'],
    llmCallsMin: 1,
    llmCallsMax: 2,
  },
  {
    id: 3,
    name: '个性化计划生成',
    description: '基于差距分析生成 4 周冲刺计划',
    produces: 'personalizedPlan',
    requiredInputs: ['aggregatedProfile', 'gapAnalysis', 'preferences'],
    llmCallsMin: 1,
    llmCallsMax: 2,
  },
  {
    id: 4,
    name: '计划优化与确认',
    description: '智能评估可行性并优化计划',
    produces: 'optimizedPlan',
    requiredInputs: ['personalizedPlan', 'gapAnalysis'],
    optional: true,
    llmCallsMin: 1,
    llmCallsMax: 1,
  },
] as const;

export type WorkflowStageId = (typeof WORKFLOW_STAGES)[number]['id'];

export interface WorkflowContext {
  input: {
    rawJDs: RawJDInput[];
    rawExperiences?: RawExperienceInput[];
    preferences: UserPreferences;
    existingJdResults?: JDOutput[];
    existingExperienceResults?: ExperienceMap[];
    regenerateFromStage?: number;
  };

  results: {
    aggregatedProfile?: AggregatedJDProfile;
    gapAnalysis?: GapAnalysisResult;
    personalizedPlan?: PersonalizedSprintPlan;
    optimizedPlan?: OptimizedSprintPlan;
  };

  metadata: {
    workflowId: string;
    startTime: string;
    stagesCompleted: number;
    totalStages: number;
    llmCalls: number;
  };

  stream?: WorkflowStreamHandler;
}

export interface WorkflowProgress {
  stage: WorkflowStageId;
  stageName: string;
  status: 'running' | 'completed' | 'error';
  progress: number;
  message: string;
}

export interface StageCompleteResult {
  stage: WorkflowStageId;
  stageName: string;
  result: any;
}

export type WorkflowStreamHandler = (
  type: 'progress' | 'stage-complete' | 'error' | 'complete',
  data: WorkflowProgress | StageCompleteResult | Error | any
) => void;

export interface WorkflowError {
  stage: WorkflowStageId;
  stageName: string;
  originalError: Error;
  partialResults: WorkflowContext['results'];
  message: string;
  retryable: boolean;
}

export interface BuildFinalOutputOptions {
  context: WorkflowContext;
  endTime: string;
}

export interface FinalSprintPlanResult {
  finalPlan: SprintPlan;
  gapReport: GapReport;
}

export function generateWorkflowId(): string {
  return `sw-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function isWorkflowError(error: unknown): error is WorkflowError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'stage' in error &&
    'stageName' in error &&
    'originalError' in error
  );
}
