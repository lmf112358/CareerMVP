import { describe, it, expect } from 'vitest';
import {
  RawJDInputSchema,
  RawExperienceInputSchema,
  UserPreferencesSchema,
  AggregatedJDProfileSchema,
  GapAnalysisResultSchema,
  PersonalizedSprintPlanSchema,
  OptimizedSprintPlanSchema,
  SprintWorkflowInputSchema,
  SprintWorkflowOutputSchema,
  WorkflowMetadataSchema,
  StageProgressEventSchema,
} from './schemas';

describe('RawJDInputSchema', () => {
  it('should validate a valid JD input', () => {
    const validInput = {
      id: 'jd-1',
      title: '产品经理',
      content: '这是一个有效的招聘要求，至少需要 20 个字符。产品经理需要负责需求分析、产品设计、项目管理等工作。',
    };
    const result = RawJDInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject JD with too short content', () => {
    const invalidInput = {
      id: 'jd-1',
      content: '太短',
    };
    const result = RawJDInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should accept JD without title', () => {
    const validInput = {
      id: 'jd-1',
      content: '这是一个有效的招聘要求，至少需要 20 个字符。产品经理需要负责需求分析、产品设计、项目管理等工作。',
    };
    const result = RawJDInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});

describe('RawExperienceInputSchema', () => {
  it('should validate a valid experience input', () => {
    const validInput = {
      id: 'exp-1',
      title: '学生会项目管理',
      content: '负责组织校园活动，协调多个部门合作，完成了多个项目。',
    };
    const result = RawExperienceInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject experience with too short content', () => {
    const invalidInput = {
      id: 'exp-1',
      content: '短',
    };
    const result = RawExperienceInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe('UserPreferencesSchema', () => {
  it('should validate valid preferences', () => {
    const validInput = {
      dailyHoursAvailable: 2,
      currentLevel: 'beginner',
      priorityStrategy: 'critical-first',
    };
    const result = UserPreferencesSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should accept all valid currentLevel values', () => {
    const levels = ['beginner', 'intermediate', 'advanced'] as const;
    levels.forEach((level) => {
      const result = UserPreferencesSchema.safeParse({
        dailyHoursAvailable: 2,
        currentLevel: level,
        priorityStrategy: 'critical-first',
      });
      expect(result.success).toBe(true);
    });
  });

  it('should accept all valid priorityStrategy values', () => {
    const strategies = ['critical-first', 'balanced', 'confidence-first'] as const;
    strategies.forEach((strategy) => {
      const result = UserPreferencesSchema.safeParse({
        dailyHoursAvailable: 2,
        currentLevel: 'beginner',
        priorityStrategy: strategy,
      });
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid dailyHoursAvailable', () => {
    const result = UserPreferencesSchema.safeParse({
      dailyHoursAvailable: 10, // 超过最大值 8
      currentLevel: 'beginner',
      priorityStrategy: 'critical-first',
    });
    expect(result.success).toBe(false);
  });
});

describe('SprintWorkflowInputSchema', () => {
  it('should validate input with 1 JD', () => {
    const validInput = {
      rawJDs: [
        {
          id: 'jd-1',
          content: '这是一个有效的招聘要求，至少需要 20 个字符。产品经理需要负责需求分析、产品设计、项目管理等工作。',
        },
      ],
      preferences: {
        dailyHoursAvailable: 2,
        currentLevel: 'beginner',
        priorityStrategy: 'critical-first',
      },
    };
    const result = SprintWorkflowInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should validate input with 3 JDs', () => {
    const jdContent = '这是一个有效的招聘要求，至少需要 20 个字符。产品经理需要负责需求分析、产品设计、项目管理等工作。';
    const validInput = {
      rawJDs: [
        { id: 'jd-1', content: jdContent },
        { id: 'jd-2', content: jdContent },
        { id: 'jd-3', content: jdContent },
      ],
      preferences: {
        dailyHoursAvailable: 2,
        currentLevel: 'beginner',
        priorityStrategy: 'critical-first',
      },
    };
    const result = SprintWorkflowInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject input without JDs', () => {
    const invalidInput = {
      rawJDs: [],
      preferences: {
        dailyHoursAvailable: 2,
        currentLevel: 'beginner',
        priorityStrategy: 'critical-first',
      },
    };
    const result = SprintWorkflowInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject input with more than 3 JDs', () => {
    const jdContent = '这是一个有效的招聘要求，至少需要 20 个字符。产品经理需要负责需求分析、产品设计、项目管理等工作。';
    const invalidInput = {
      rawJDs: [
        { id: 'jd-1', content: jdContent },
        { id: 'jd-2', content: jdContent },
        { id: 'jd-3', content: jdContent },
        { id: 'jd-4', content: jdContent },
      ],
      preferences: {
        dailyHoursAvailable: 2,
        currentLevel: 'beginner',
        priorityStrategy: 'critical-first',
      },
    };
    const result = SprintWorkflowInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should validate input with experiences', () => {
    const validInput = {
      rawJDs: [
        {
          id: 'jd-1',
          content: '这是一个有效的招聘要求，至少需要 20 个字符。产品经理需要负责需求分析、产品设计、项目管理等工作。',
        },
      ],
      rawExperiences: [
        {
          id: 'exp-1',
          content: '负责组织校园活动，协调多个部门合作，完成了多个项目。',
        },
      ],
      preferences: {
        dailyHoursAvailable: 2,
        currentLevel: 'beginner',
        priorityStrategy: 'critical-first',
      },
    };
    const result = SprintWorkflowInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});

describe('AggregatedJDProfileSchema', () => {
  it('should validate a valid profile', () => {
    const validProfile = {
      sourceCount: 2,
      sourceTitles: ['产品经理', '高级产品经理'],
      commonSkills: {
        hard: ['PRD', '数据分析', 'Axure'],
        soft: ['沟通协调', '项目管理', '用户思维'],
      },
      commonCoreActions: ['需求分析', '产品设计', '项目跟进'],
      commonHiddenRisks: ['加班多', '快速迭代压力'],
      differentiatedSkills: [
        {
          company: 'JD 1',
          uniqueSkills: ['B端产品经验'],
          emphasis: '强调数据驱动决策',
        },
      ],
      priorityMatrix: [
        {
          skill: 'PRD',
          category: 'hard',
          priority: 'Critical',
          reasoning: '产品经理的核心技能',
        },
      ],
      unifiedCapabilityVector: [
        {
          dimension: '产品设计能力',
          requiredLevel: 'Intermediate',
          description: '能够独立完成产品设计',
        },
      ],
    };
    const result = AggregatedJDProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });
});

describe('GapAnalysisResultSchema', () => {
  it('should validate a valid gap analysis', () => {
    const validAnalysis = {
      overallCoverage: 65,
      skillGaps: [
        {
          skill: 'PRD',
          category: 'hard',
          priority: 'Critical',
          isRequired: true,
          isCovered: false,
          matchScore: 0,
          gapDescription: '没有相关经历',
          suggestion: '学习 PRD 撰写方法',
        },
      ],
      experienceMatches: [
        {
          experienceId: 'exp-1',
          skillsCovered: ['项目管理'],
          skillsPartiallyCovered: ['数据分析'],
          contributionScore: 45,
          strengths: ['有项目协调经验'],
          weaknesses: ['缺乏产品相关技能'],
        },
      ],
      criticalGaps: ['PRD', 'Axure'],
      highPriorityGaps: ['数据分析'],
      recommendationSummary: '建议重点学习 PRD 撰写和 Axure 使用',
      coverageByCategory: [
        {
          category: '硬技能',
          required: 8,
          covered: 3,
          percentage: 37.5,
        },
      ],
    };
    const result = GapAnalysisResultSchema.safeParse(validAnalysis);
    expect(result.success).toBe(true);
  });
});

describe('StageProgressEventSchema', () => {
  it('should validate a valid progress event', () => {
    const validEvent = {
      stage: 1,
      stageName: 'JD 聚合与提炼',
      status: 'running',
      progress: 0.5,
      message: '正在分析 JD 内容...',
    };
    const result = StageProgressEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it('should reject invalid progress values', () => {
    const invalidEvent = {
      stage: 1,
      stageName: 'JD 聚合与提炼',
      status: 'running',
      progress: 1.5, // 超过 1.0
      message: '正在分析 JD 内容...',
    };
    const result = StageProgressEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });
});

describe('WorkflowMetadataSchema', () => {
  it('should validate valid metadata', () => {
    const validMetadata = {
      workflowId: 'sw-123456-abcdef',
      startTime: '2026-04-25T10:00:00.000Z',
      endTime: '2026-04-25T10:01:30.000Z',
      totalDurationMs: 90000,
      stagesCompleted: 4,
      totalStages: 4,
      llmCalls: 6,
      version: '1.0.0',
    };
    const result = WorkflowMetadataSchema.safeParse(validMetadata);
    expect(result.success).toBe(true);
  });
});
