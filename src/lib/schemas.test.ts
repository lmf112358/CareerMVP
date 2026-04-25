import { describe, it, expect } from 'vitest';
import {
  JDOutputSchema,
  ExperienceMapSchema,
  MockFeedbackSchema,
  ApiErrorSchema,
} from './schemas';

describe('JDOutputSchema', () => {
  it('should validate a valid JD output', () => {
    const valid = {
      core_actions: ['产品规划', '用户调研', '需求分析'],
      mvs_skills: {
        hard: ['Axure', 'Figma', 'SQL', '数据分析'],
        soft: ['跨部门沟通', '项目管理', '快速学习'],
      },
      hidden_risks: ['加班可能较多', '要求快速上手', '指标压力大'],
      weekly_proof: [
        { week: 1, task: '熟悉产品文档和业务逻辑', proof_type: '文档' as const },
        { week: 2, task: '完成一次用户调研并输出报告', proof_type: '文档' as const },
      ],
    };

    const result = JDOutputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid proof_type', () => {
    const invalid = {
      core_actions: ['test'],
      mvs_skills: { hard: [], soft: [] },
      hidden_risks: [],
      weekly_proof: [
        { week: 1, task: 'test', proof_type: 'invalid_type' },
      ],
    };

    const result = JDOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject week outside 1-4', () => {
    const invalid = {
      core_actions: ['test'],
      mvs_skills: { hard: [], soft: [] },
      hidden_risks: [],
      weekly_proof: [
        { week: 5, task: 'test', proof_type: '截图' as const },
      ],
    };

    const result = JDOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('ExperienceMapSchema', () => {
  it('should validate a valid experience map', () => {
    const valid = {
      original: '我在学生会做过招新活动...',
      optimized: {
        situation: '当时学生会新一届招新，上一年效果一般...',
        task: '我负责设计宣传海报和现场签到...',
        action: '我参考了 5 个高校的海报设计...',
        result: '最终报名人数比去年提升了 30%...',
      },
      transferable_skills: ['项目管理', '跨部门协作', '快速学习'],
      resume_line: '主导学生会招新项目，通过优化宣传策略和现场流程，实现报名人数同比增长 30%。',
    };

    const result = ExperienceMapSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe('MockFeedbackSchema', () => {
  it('should validate a valid feedback', () => {
    const valid = {
      score: 78,
      strengths: ['逻辑清晰', '数据意识强', '沟通顺畅'],
      weaknesses: ['结果未量化', '缺乏复盘视角'],
      optimized_star: {
        situation: '在项目进度滞后两周时...',
        task: '需要把进度追回并保证质量...',
        action: '我重新梳理了需求优先级...',
        result: '最终项目按时交付，需求覆盖率 95%...',
      },
    };

    const result = MockFeedbackSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject score outside 0-100', () => {
    const invalid = {
      score: 150,
      strengths: [],
      weaknesses: [],
      optimized_star: { situation: '', task: '', action: '', result: '' },
    };

    const result = MockFeedbackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('ApiErrorSchema', () => {
  it('should validate a valid API error', () => {
    const valid = {
      error: '解析失败',
      retry: true,
      retryAfter: 60,
    };

    const result = ApiErrorSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should validate minimal API error', () => {
    const minimal = {
      error: '服务暂时不可用',
    };

    const result = ApiErrorSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});
