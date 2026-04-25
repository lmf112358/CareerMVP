import { z } from 'zod';

export const JDOutputSchema = z.object({
  core_actions: z.array(z.string().max(100)),
  mvs_skills: z.object({
    hard: z.array(z.string()),
    soft: z.array(z.string()),
  }),
  hidden_risks: z.array(z.string()),
  weekly_proof: z.array(
    z.object({
      week: z.number().min(1).max(4),
      task: z.string(),
      proof_type: z.enum(['截图', '链接', '文档', '代码']),
    })
  ),
});

export const ExperienceMapSchema = z.object({
  original: z.string(),
  optimized: z.object({
    situation: z.string(),
    task: z.string(),
    action: z.string(),
    result: z.string(),
  }),
  transferable_skills: z.array(z.string()),
  resume_line: z.string(),
});

export const SprintTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  resources: z.array(
    z.object({
      title: z.string(),
      url: z.string().url().optional(),
      type: z.enum(['文档', '视频', '教程', '实战项目', '其他']),
    })
  ),
  deliverable_type: z.string(),
  completed: z.boolean().default(false),
});

export const SprintWeekSchema = z.object({
  week: z.number().min(1).max(4),
  theme: z.string(),
  tasks: z.array(SprintTaskSchema),
});

export const SprintPlanSchema = z.array(SprintWeekSchema);

export const MockFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  optimized_star: z.object({
    situation: z.string(),
    task: z.string(),
    action: z.string(),
    result: z.string(),
  }),
});

export const ApiErrorSchema = z.object({
  error: z.string(),
  retry: z.boolean().optional(),
  retryAfter: z.number().optional(),
});

export const RawJDInputSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string().min(20).max(15000),
});

export const RawExperienceInputSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string().min(10).max(5000),
});

export const UserPreferencesSchema = z.object({
  dailyHoursAvailable: z.number().min(0.5).max(8).default(2),
  currentLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  priorityStrategy: z
    .enum(['critical-first', 'balanced', 'confidence-first'])
    .default('critical-first'),
});

export const AggregatedJDProfileSchema = z.object({
  sourceCount: z.number().min(1).max(3),
  sourceTitles: z.array(z.string()).optional(),
  commonSkills: z.object({
    hard: z.array(z.string()),
    soft: z.array(z.string()),
  }),
  commonCoreActions: z.array(z.string()),
  commonHiddenRisks: z.array(z.string()),
  differentiatedSkills: z.array(
    z.object({
      company: z.string(),
      uniqueSkills: z.array(z.string()),
      emphasis: z.string(),
    })
  ),
  priorityMatrix: z.array(
    z.object({
      skill: z.string(),
      category: z.enum(['hard', 'soft', 'action']),
      priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
      reasoning: z.string(),
    })
  ),
  unifiedCapabilityVector: z.array(
    z.object({
      dimension: z.string(),
      requiredLevel: z.enum(['Basic', 'Intermediate', 'Advanced']),
      description: z.string(),
    })
  ),
});

export const SkillGapSchema = z.object({
  skill: z.string(),
  category: z.enum(['hard', 'soft']),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  isRequired: z.boolean(),
  isCovered: z.boolean(),
  matchScore: z.number().min(0).max(100),
  coveredByExperiences: z.array(z.string()).optional(),
  gapDescription: z.string().optional(),
  suggestion: z.string().optional(),
});

export const ExperienceMatchSchema = z.object({
  experienceId: z.string(),
  experienceTitle: z.string().optional(),
  skillsCovered: z.array(z.string()),
  skillsPartiallyCovered: z.array(z.string()),
  contributionScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export const CoverageByCategorySchema = z.object({
  category: z.string(),
  required: z.number(),
  covered: z.number(),
  percentage: z.number().min(0).max(100),
});

export const GapAnalysisResultSchema = z.object({
  overallCoverage: z.number().min(0).max(100),
  skillGaps: z.array(SkillGapSchema),
  experienceMatches: z.array(ExperienceMatchSchema),
  criticalGaps: z.array(z.string()),
  highPriorityGaps: z.array(z.string()),
  recommendationSummary: z.string(),
  coverageByCategory: z.array(CoverageByCategorySchema),
});

export const EnhancedTaskResourceSchema = z.object({
  title: z.string(),
  url: z.string().url().optional(),
  type: z.enum(['文档', '视频', '教程', '实战项目', '其他']),
  priority: z.enum(['Must', 'Should', 'Could']),
  estimatedTimeMinutes: z.number().optional(),
});

export const EnhancedSprintTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedHours: z.number(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  targetSkills: z.array(z.string()),
  gapAddressing: z.string(),
  resources: z.array(EnhancedTaskResourceSchema),
  deliverableType: z.string(),
  deliverableDescription: z.string(),
  evidenceExample: z.string().optional(),
  acceptanceCriteria: z.array(z.string()),
  dependsOnTasks: z.array(z.string()).optional(),
  completed: z.boolean().default(false),
});

export const MilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  isKeyMilestone: z.boolean(),
  dependsOnTaskIds: z.array(z.string()).optional(),
});

export const FocusSkillSchema = z.object({
  skill: z.string(),
  priority: z.enum(['Critical', 'High', 'Medium']),
  gapStatus: z.enum(['uncovered', 'partial', 'covered']),
  targetLevel: z.string(),
});

export const EnhancedSprintWeekSchema = z.object({
  week: z.number().min(1).max(4),
  theme: z.string(),
  focusDescription: z.string(),
  focusSkills: z.array(FocusSkillSchema),
  tasks: z.array(EnhancedSprintTaskSchema),
  milestones: z.array(MilestoneSchema),
});

export const GapCoveragePlanSchema = z.object({
  skill: z.string(),
  priority: z.string(),
  weekToCover: z.number(),
  taskIds: z.array(z.string()),
  estimatedCoverageAfter: z.enum(['partial', 'full']),
});

export const LearningPathRecommendationSchema = z.object({
  resource: z.string(),
  type: z.string(),
  reason: z.string(),
  priority: z.enum(['High', 'Medium']),
  url: z.string().url().optional(),
});

export const PlanStatsSchema = z.object({
  totalTasks: z.number(),
  totalEstimatedHours: z.number(),
  criticalGapsToAddress: z.number(),
  highPriorityGapsToAddress: z.number(),
  estimatedCoverageImprovement: z.number(),
});

export const PersonalizedSprintPlanSchema = z.object({
  generatedAt: z.string(),
  version: z.number().default(1),
  basedOnGapAnalysis: z.boolean(),
  userContext: z.object({
    dailyHoursAvailable: z.number(),
    currentLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    priorityStrategy: z.string(),
  }),
  weeks: z.array(EnhancedSprintWeekSchema),
  gapCoveragePlan: z.array(GapCoveragePlanSchema),
  learningPathRecommendations: z.array(LearningPathRecommendationSchema),
  planStats: PlanStatsSchema,
});

export const OptimizationSchema = z.object({
  type: z.enum(['task_swap', 'time_adjustment', 'dependency_fix', 'user_request']),
  description: z.string(),
  reasoning: z.string(),
});

export const FeasibilityIssueSchema = z.object({
  severity: z.enum(['Critical', 'Warning', 'Info']),
  description: z.string(),
  suggestion: z.string().optional(),
});

export const FeasibilityCheckSchema = z.object({
  overallScore: z.number().min(0).max(100),
  issues: z.array(FeasibilityIssueSchema),
  suggestions: z.array(z.string()),
});

export const UserAdjustmentSchema = z.object({
  parameter: z.string(),
  originalValue: z.any(),
  newValue: z.any(),
  rationale: z.string().optional(),
});

export const OptimizedSprintPlanSchema = z.object({
  basePlan: PersonalizedSprintPlanSchema,
  optimizations: z.array(OptimizationSchema),
  feasibilityCheck: FeasibilityCheckSchema,
  userAdjustments: z.array(UserAdjustmentSchema).optional(),
});

export const SprintWorkflowInputSchema = z.object({
  rawJDs: z.array(RawJDInputSchema).min(1).max(3),
  rawExperiences: z.array(RawExperienceInputSchema).optional(),
  preferences: UserPreferencesSchema,
  existingJdResults: z.array(JDOutputSchema).optional(),
  existingExperienceResults: z.array(ExperienceMapSchema).optional(),
  regenerateFromStage: z.number().optional(),
});

export const GapReportSchema = z.object({
  overallCoverage: z.number().min(0).max(100),
  criticalGaps: z.array(z.string()),
  improvements: z.array(z.string()),
});

export const WorkflowMetadataSchema = z.object({
  workflowId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  totalDurationMs: z.number(),
  stagesCompleted: z.number(),
  totalStages: z.number(),
  llmCalls: z.number(),
  version: z.string(),
});

export const SprintWorkflowOutputSchema = z.object({
  aggregatedProfile: AggregatedJDProfileSchema.optional(),
  gapAnalysis: GapAnalysisResultSchema.optional(),
  personalizedPlan: PersonalizedSprintPlanSchema.optional(),
  optimizedPlan: OptimizedSprintPlanSchema.optional(),
  finalPlan: SprintPlanSchema,
  gapReport: GapReportSchema,
  metadata: WorkflowMetadataSchema,
});

export const StageProgressEventSchema = z.object({
  stage: z.number(),
  stageName: z.string(),
  status: z.enum(['running', 'completed', 'error']),
  progress: z.number().min(0).max(1),
  message: z.string(),
});

export type RawJDInput = z.infer<typeof RawJDInputSchema>;
export type RawExperienceInput = z.infer<typeof RawExperienceInputSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type AggregatedJDProfile = z.infer<typeof AggregatedJDProfileSchema>;
export type SkillGap = z.infer<typeof SkillGapSchema>;
export type ExperienceMatch = z.infer<typeof ExperienceMatchSchema>;
export type CoverageByCategory = z.infer<typeof CoverageByCategorySchema>;
export type GapAnalysisResult = z.infer<typeof GapAnalysisResultSchema>;
export type EnhancedTaskResource = z.infer<typeof EnhancedTaskResourceSchema>;
export type EnhancedSprintTask = z.infer<typeof EnhancedSprintTaskSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type FocusSkill = z.infer<typeof FocusSkillSchema>;
export type EnhancedSprintWeek = z.infer<typeof EnhancedSprintWeekSchema>;
export type GapCoveragePlan = z.infer<typeof GapCoveragePlanSchema>;
export type LearningPathRecommendation = z.infer<typeof LearningPathRecommendationSchema>;
export type PlanStats = z.infer<typeof PlanStatsSchema>;
export type PersonalizedSprintPlan = z.infer<typeof PersonalizedSprintPlanSchema>;
export type Optimization = z.infer<typeof OptimizationSchema>;
export type FeasibilityIssue = z.infer<typeof FeasibilityIssueSchema>;
export type FeasibilityCheck = z.infer<typeof FeasibilityCheckSchema>;
export type UserAdjustment = z.infer<typeof UserAdjustmentSchema>;
export type OptimizedSprintPlan = z.infer<typeof OptimizedSprintPlanSchema>;
export type SprintWorkflowInput = z.infer<typeof SprintWorkflowInputSchema>;
export type GapReport = z.infer<typeof GapReportSchema>;
export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;
export type SprintWorkflowOutput = z.infer<typeof SprintWorkflowOutputSchema>;
export type StageProgressEvent = z.infer<typeof StageProgressEventSchema>;

export type JDOutput = z.infer<typeof JDOutputSchema>;
export type ExperienceMap = z.infer<typeof ExperienceMapSchema>;
export type SprintTask = z.infer<typeof SprintTaskSchema>;
export type SprintWeek = z.infer<typeof SprintWeekSchema>;
export type SprintPlan = z.infer<typeof SprintPlanSchema>;
export type MockFeedback = z.infer<typeof MockFeedbackSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
