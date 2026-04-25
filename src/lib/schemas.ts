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
      type: z.enum(['文档', '视频', '教程', '其他']),
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

export type JDOutput = z.infer<typeof JDOutputSchema>;
export type ExperienceMap = z.infer<typeof ExperienceMapSchema>;
export type SprintTask = z.infer<typeof SprintTaskSchema>;
export type SprintWeek = z.infer<typeof SprintWeekSchema>;
export type SprintPlan = z.infer<typeof SprintPlanSchema>;
export type MockFeedback = z.infer<typeof MockFeedbackSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
