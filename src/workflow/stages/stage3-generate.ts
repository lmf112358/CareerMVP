import { generateObject } from 'ai';
import { defaultGenerateOptions, openai, defaultModel } from '@/lib/ai';
import {
  PersonalizedSprintPlanSchema,
  SprintPlanSchema,
  AggregatedJDProfile,
  GapAnalysisResult,
  UserPreferences,
  PersonalizedSprintPlan,
  SprintPlan,
} from '@/lib/schemas';
import type { WorkflowContext } from '../types';

const MAX_RETRIES = 2;

function buildContextForPlan(
  aggregatedProfile: AggregatedJDProfile,
  gapAnalysis: GapAnalysisResult,
  preferences: UserPreferences
): string {
  const levelLabels: Record<string, string> = {
    beginner: '入门级',
    intermediate: '进阶级',
    advanced: '高级',
  };

  const strategyLabels: Record<string, string> = {
    'critical-first': '优先弥补 Critical 差距',
    balanced: '均衡覆盖',
    'confidence-first': '先做容易提升信心的任务',
  };

  return `
## 用户偏好

- 每天可用时间：${preferences.dailyHoursAvailable} 小时
- 当前水平：${levelLabels[preferences.currentLevel]}
- 优先级策略：${strategyLabels[preferences.priorityStrategy]}

## 岗位要求摘要

### 硬技能
${aggregatedProfile.commonSkills.hard.join('、')}

### 软技能
${aggregatedProfile.commonSkills.soft.join('、')}

### 核心动作
${aggregatedProfile.commonCoreActions.join('、')}

### 优先级矩阵（Critical/High 优先级）
${aggregatedProfile.priorityMatrix
  .filter((p) => p.priority === 'Critical' || p.priority === 'High')
  .map((p) => `- ${p.skill} (${p.priority}): ${p.reasoning}`)
  .join('\n')}

## 差距分析结果

### 总体覆盖度：${gapAnalysis.overallCoverage}%

### 关键差距 (Critical)
${gapAnalysis.criticalGaps.length > 0 ? gapAnalysis.criticalGaps.map((g) => `- ${g}`).join('\n') : '无'}

### 高优先级差距 (High)
${gapAnalysis.highPriorityGaps.length > 0 ? gapAnalysis.highPriorityGaps.map((g) => `- ${g}`).join('\n') : '无'}

### 技能差距详情
${gapAnalysis.skillGaps
  .slice(0, 15)
  .map(
    (g) =>
      `- ${g.skill}: ${g.isCovered ? '已覆盖' : '未覆盖'} (匹配度 ${g.matchScore}%, 优先级 ${g.priority})${g.suggestion ? ` | 建议：${g.suggestion}` : ''}`
  )
  .join('\n')}

### 按类别覆盖度
${gapAnalysis.coverageByCategory
  .map((c) => `- ${c.category}: ${c.covered}/${c.required} (${c.percentage}%)`)
  .join('\n')}
`;
}

export async function executeStage3(
  context: WorkflowContext,
  onProgress?: (progress: number, message: string) => void
): Promise<PersonalizedSprintPlan> {
  const { preferences } = context.input;
  const { aggregatedProfile, gapAnalysis } = context.results;

  if (!aggregatedProfile) {
    throw new Error('阶段 3 需要先完成阶段 1（JD 聚合）');
  }

  if (!gapAnalysis) {
    throw new Error('阶段 3 需要先完成阶段 2（差距分析）');
  }

  onProgress?.(0.05, '开始生成个性化冲刺计划...');

  const contextStr = buildContextForPlan(aggregatedProfile, gapAnalysis, preferences);

  onProgress?.(0.1, '分析差距优先级...');

  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      onProgress?.(0.2 + retries * 0.2, '生成计划中...');

      const result = await generateObject({
        ...defaultGenerateOptions,
        model: openai(defaultModel),
        schema: PersonalizedSprintPlanSchema,
        prompt: `你是一位资深职业规划师和学习路径设计师。

请基于以下信息，生成一个 4 周的个性化冲刺计划。

## 计划设计原则

1. **差距优先**：优先弥补 Critical 和 High 优先级的差距
2. **微步可执行**：每个任务 30-60 分钟可完成
3. **可交付证据**：每个任务都有明确的交付物
4. **信心递增**：从易到难，从输入到输出
5. **个性化**：
   - 考虑用户当前水平
   - 考虑每天可用时间
   - 遵循用户的优先级策略

## 计划结构要求

### 每周计划 (weeks)
每周包含：
- week: 1-4
- theme: 本周主题
- focusDescription: 本周重点描述
- focusSkills: 本周聚焦的技能（包含优先级和差距状态）
- tasks: 2-3 个任务（增强版）
- milestones: 1-2 个里程碑

### 增强版任务 (EnhancedSprintTask)
每个任务包含：
- id: 唯一标识
- title: 简短标题
- description: 详细描述
- estimatedHours: 预计小时数（根据用户每天可用时间合理分配）
- difficulty: Easy / Medium / Hard
- targetSkills: 这个任务针对的技能
- gapAddressing: 这个任务如何弥补差距
- resources: 学习资源（带优先级 Must/Should/Could）
- deliverableType: 交付物类型
- deliverableDescription: 交付物描述
- evidenceExample: 交付物示例（可选）
- acceptanceCriteria: 验收标准列表
- dependsOnTasks: 依赖的任务 ID（可选）
- completed: false

### 差距覆盖计划 (gapCoveragePlan)
- 每个技能在第几周覆盖
- 通过哪些任务
- 预计覆盖程度（partial/full）

### 学习路径建议 (learningPathRecommendations)
- 推荐的资源
- 推荐理由
- 优先级

### 计划统计 (planStats)
- totalTasks: 总任务数
- totalEstimatedHours: 总预计小时
- criticalGapsToAddress: 计划覆盖的 Critical 差距数
- highPriorityGapsToAddress: 计划覆盖的 High 优先级差距数
- estimatedCoverageImprovement: 预计覆盖度提升百分比

${contextStr}

请基于以上信息，生成一个完整的 4 周个性化冲刺计划。`,
      });

      onProgress?.(0.95, '计划生成完成');

      return result.object;
    } catch (error) {
      retries++;
      if (retries > MAX_RETRIES) {
        throw new Error(`计划生成失败: ${error instanceof Error ? error.message : String(error)}`);
      }
      await new Promise((r) => setTimeout(r, 1000 * retries));
    }
  }

  throw new Error('计划生成失败，重试次数用完');
}

export function personalizedToSprintPlan(
  personalized: PersonalizedSprintPlan
): SprintPlan {
  return personalized.weeks.map((week) => ({
    week: week.week,
    theme: week.theme,
    tasks: week.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      resources: task.resources.map((r) => ({
        title: r.title,
        url: r.url,
        type: r.type,
      })),
      deliverable_type: task.deliverableType,
      completed: task.completed,
    })),
  }));
}

export function calculateCoverageImprovement(
  initialCoverage: number,
  personalized: PersonalizedSprintPlan
): number {
  const criticalCount = personalized.planStats.criticalGapsToAddress;
  const highCount = personalized.planStats.highPriorityGapsToAddress;

  // 简单估算：每个 Critical 差距提升 5%，High 提升 3%
  const estimatedImprovement = criticalCount * 5 + highCount * 3;

  return Math.min(100 - initialCoverage, estimatedImprovement);
}
