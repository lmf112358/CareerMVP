import { generateObject } from 'ai';
import { defaultGenerateOptions, openai, defaultModel } from '@/lib/ai';
import {
  OptimizedSprintPlanSchema,
  PersonalizedSprintPlan,
  GapAnalysisResult,
  OptimizedSprintPlan,
} from '@/lib/schemas';
import type { WorkflowContext } from '../types';

const MAX_RETRIES = 2;

function buildContextForOptimization(
  personalizedPlan: PersonalizedSprintPlan,
  gapAnalysis: GapAnalysisResult
): string {
  const tasksByWeek = personalizedPlan.weeks.map((week) => ({
    week: week.week,
    theme: week.theme,
    tasks: week.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      estimatedHours: t.estimatedHours,
      difficulty: t.difficulty,
      targetSkills: t.targetSkills,
    })),
  }));

  const totalHours = personalizedPlan.planStats.totalEstimatedHours;
  const dailyHours = personalizedPlan.userContext.dailyHoursAvailable;
  const weeklyHours = dailyHours * 7;

  return `
## 原始计划概况

### 用户上下文
- 每天可用时间：${dailyHours} 小时
- 当前水平：${personalizedPlan.userContext.currentLevel}
- 优先级策略：${personalizedPlan.userContext.priorityStrategy}

### 计划统计
- 总任务数：${personalizedPlan.planStats.totalTasks}
- 总预计小时：${totalHours}
- 每周平均：${(totalHours / 4).toFixed(1)} 小时
- 用户每周可用：${weeklyHours} 小时

### 每周计划详情
${tasksByWeek
  .map(
    (w) => `
#### 第 ${w.week} 周：${w.theme}
${w.tasks
  .map(
    (t) =>
      `- ${t.title} (${t.estimatedHours}小时, ${t.difficulty}, 目标: ${t.targetSkills.join(', ')})`
  )
  .join('\n')}
`
  )
  .join('')}

### 差距分析参考
- 总体覆盖度：${gapAnalysis.overallCoverage}%
- Critical 差距：${gapAnalysis.criticalGaps.length} 项
- High 优先级差距：${gapAnalysis.highPriorityGaps.length} 项

### 差距覆盖计划
${personalizedPlan.gapCoveragePlan
  .map((g) => `- ${g.skill}: 第${g.weekToCover}周覆盖 (${g.estimatedCoverageAfter})`)
  .join('\n')}
`;
}

export async function executeStage4(
  context: WorkflowContext,
  onProgress?: (progress: number, message: string) => void
): Promise<OptimizedSprintPlan> {
  const { personalizedPlan, gapAnalysis } = context.results;

  if (!personalizedPlan) {
    throw new Error('阶段 4 需要先完成阶段 3（计划生成）');
  }

  if (!gapAnalysis) {
    throw new Error('阶段 4 需要阶段 2 的差距分析结果');
  }

  onProgress?.(0.05, '开始计划优化与可行性检查...');

  const contextStr = buildContextForOptimization(personalizedPlan, gapAnalysis);

  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      onProgress?.(0.2 + retries * 0.2, '检查计划可行性...');

      const result = await generateObject({
        ...defaultGenerateOptions,
        model: openai(defaultModel),
        schema: OptimizedSprintPlanSchema,
        prompt: `你是一位资深职业规划师和学习科学家。

请分析以下 4 周冲刺计划的可行性，并进行必要的优化。

## 分析维度

### 1. 时间可行性检查
- 总预计小时是否合理（考虑用户每天可用时间）
- 每周任务负载是否均衡
- 任务之间的依赖关系是否合理

### 2. 难度递进检查
- 任务难度是否从易到难
- 是否有信心递增效应
- 关键差距是否按优先级排序

### 3. 差距覆盖检查
- Critical 差距是否都有覆盖
- 覆盖顺序是否合理
- 是否有遗漏的重要差距

### 4. 可执行性检查
- 每个任务是否有明确的交付物
- 学习资源是否具体可行
- 验收标准是否可衡量

## 输出要求

### basePlan
保留原始计划（不修改）

### optimizations
如果发现问题，列出优化措施：
- type: task_swap / time_adjustment / dependency_fix / user_request
- description: 优化描述
- reasoning: 为什么需要这个优化

### feasibilityCheck
- overallScore: 0-100 的可行性评分
- issues: 发现的问题（按严重程度）
  - severity: Critical / Warning / Info
  - description: 问题描述
  - suggestion: 建议如何解决
- suggestions: 改进建议列表

${contextStr}

请基于以上信息，完成计划优化与可行性检查。`,
      });

      onProgress?.(0.95, '优化完成');

      return result.object;
    } catch (error) {
      retries++;
      if (retries > MAX_RETRIES) {
        // 如果优化失败，返回一个默认的优化结果（不做任何修改）
        return {
          basePlan: personalizedPlan,
          optimizations: [],
          feasibilityCheck: {
            overallScore: 75,
            issues: [],
            suggestions: ['优化步骤暂时不可用，使用原始计划'],
          },
        };
      }
      await new Promise((r) => setTimeout(r, 1000 * retries));
    }
  }

  throw new Error('计划优化失败，重试次数用完');
}

export function shouldSkipStage4(context: WorkflowContext): boolean {
  // 如果没有差距分析结果，或者用户时间充足，可以跳过优化
  const { gapAnalysis } = context.results;
  const { preferences } = context.input;

  if (!gapAnalysis) return true;

  // 如果覆盖度已经很高（>90%），且没有 Critical 差距，可以跳过
  if (gapAnalysis.overallCoverage > 90 && gapAnalysis.criticalGaps.length === 0) {
    return true;
  }

  // 如果用户每天可用时间充足（>3小时），可能不需要调整
  if (preferences.dailyHoursAvailable >= 3) {
    return false; // 仍然进行优化，但可能建议更多任务
  }

  return false;
}

export function getQuickOptimization(
  personalizedPlan: PersonalizedSprintPlan
): OptimizedSprintPlan {
  // 快速优化：不调用 LLM，直接返回基本检查结果
  return {
    basePlan: personalizedPlan,
    optimizations: [],
    feasibilityCheck: {
      overallScore: 80,
      issues: [],
      suggestions: [
        '建议根据实际进度灵活调整任务顺序',
        '如果某个任务耗时过长，可以拆分为多个子任务',
        '完成每个任务后，记得记录交付物',
      ],
    },
  };
}
