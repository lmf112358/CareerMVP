import { generateObject } from 'ai';
import { defaultGenerateOptions, openai, defaultModel } from '@/lib/ai';
import {
  ExperienceMapSchema,
  GapAnalysisResultSchema,
  RawExperienceInput,
  AggregatedJDProfile,
  ExperienceMap,
  GapAnalysisResult,
} from '@/lib/schemas';
import type { WorkflowContext } from '../types';

const MAX_RETRIES = 2;

async function mapSingleExperience(
  experienceContent: string,
  index: number,
  jdContext?: string
): Promise<ExperienceMap> {
  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      const contextHint = jdContext
        ? `\n参考岗位背景（可选对齐）：\n${jdContext}`
        : '';

      const result = await generateObject({
        ...defaultGenerateOptions,
        model: openai(defaultModel),
        schema: ExperienceMapSchema,
        prompt: `你是一位专业的简历优化师和面试官。

请将以下用户经历按照 STAR 法则重构。

要求：
1. optimized：严格的 STAR 结构
2. transferable_skills：提取可迁移能力标签
3. resume_line：1 句话简历核心描述
4. original：保留用户原始输入

用户经历原文（经历 #${index + 1}）：
${experienceContent}${contextHint}`,
      });

      return result.object;
    } catch (error) {
      retries++;
      if (retries > MAX_RETRIES) {
        throw new Error(`经历 #${index + 1} 映射失败: ${error instanceof Error ? error.message : String(error)}`);
      }
      await new Promise((r) => setTimeout(r, 1000 * retries));
    }
  }

  throw new Error(`经历 #${index + 1} 映射失败，重试次数用完`);
}

async function analyzeSkillGaps(
  aggregatedProfile: AggregatedJDProfile,
  mappedExperiences: { input: RawExperienceInput; result: ExperienceMap }[]
): Promise<GapAnalysisResult> {
  const jdContext = `
## 岗位要求摘要

### 硬技能
${aggregatedProfile.commonSkills.hard.join('、')}

### 软技能
${aggregatedProfile.commonSkills.soft.join('、')}

### 核心动作
${aggregatedProfile.commonCoreActions.join('、')}

### 优先级矩阵
${aggregatedProfile.priorityMatrix
  .map(
    (p) =>
      `- ${p.skill} (${p.category}, ${p.priority}): ${p.reasoning}`
  )
  .join('\n')}
`;

  const experiencesContext =
    mappedExperiences.length > 0
      ? `
## 用户经历（共 ${mappedExperiences.length} 段）

${mappedExperiences
  .map(
    (e, i) => `
### 经历 #${i + 1}${e.input.title ? `: ${e.input.title}` : ''}

**原始描述：**
${e.result.original}

**STAR 优化版：**
- 情境：${e.result.optimized.situation}
- 任务：${e.result.optimized.task}
- 行动：${e.result.optimized.action}
- 结果：${e.result.optimized.result}

**可迁移技能：**
${e.result.transferable_skills.join('、')}

**简历话术：**
${e.result.resume_line}
`
  )
  .join('\n---\n')}
`
      : `
## 用户经历
用户没有提供任何经历。
`;

  const result = await generateObject({
    ...defaultGenerateOptions,
    model: openai(defaultModel),
    schema: GapAnalysisResultSchema,
    prompt: `你是一位资深面试官和职业规划专家。

请基于以下岗位要求和用户经历，进行能力差距分析。

## 分析原则（严标准）
1. **必须明确匹配**：只有用户经历中明确提到的技能才算覆盖
2. **相关不等于覆盖**：类似技能不能替代要求的技能
3. **量化匹配度**：给每个技能打分 (0-100)
4. **优先级导向**：Critical 技能的差距必须重点指出

## 分析维度
1. **总体覆盖度** (overallCoverage)：用户经历覆盖了多少岗位要求 (0-100)
2. **技能差距详情** (skillGaps)：每个技能的匹配情况
   - isRequired: 是否是岗位要求的
   - isCovered: 用户经历是否覆盖
   - matchScore: 匹配度分数 (0-100)
   - coveredByExperiences: 哪些经历覆盖了这个技能
   - gapDescription: 如果未覆盖，描述差距
   - suggestion: 建议如何弥补

3. **经历匹配详情** (experienceMatches)：每个经历的贡献
   - skillsCovered: 完全覆盖的技能
   - skillsPartiallyCovered: 部分覆盖的技能
   - contributionScore: 对总体覆盖度的贡献值 (0-100)
   - strengths: 这段经历的亮点
   - weaknesses: 这段经历可改进的地方

4. **关键差距汇总**
   - criticalGaps: Critical 优先级的差距
   - highPriorityGaps: High 优先级的差距

5. **覆盖度分类统计** (coverageByCategory)
   - 按类别统计：如"硬技能"、"软技能"、"项目经验"等
   - 每个类别的 required / covered / percentage

${jdContext}

${experiencesContext}

请基于以上信息，生成详细的能力差距分析报告。`,
  });

  return result.object;
}

export async function executeStage2(
  context: WorkflowContext,
  onProgress?: (progress: number, message: string) => void
): Promise<GapAnalysisResult> {
  const { rawExperiences, existingExperienceResults } = context.input;
  const { aggregatedProfile } = context.results;

  if (!aggregatedProfile) {
    throw new Error('阶段 2 需要先完成阶段 1（JD 聚合）');
  }

  onProgress?.(0.05, '开始能力差距分析...');

  const jdContext = `
岗位要求摘要：
- 硬技能：${aggregatedProfile.commonSkills.hard.join('、')}
- 软技能：${aggregatedProfile.commonSkills.soft.join('、')}
- 核心动作：${aggregatedProfile.commonCoreActions.join('、')}
`;

  let mappedExperiences: { input: RawExperienceInput; result: ExperienceMap }[] = [];

  if (rawExperiences && rawExperiences.length > 0) {
    if (
      existingExperienceResults &&
      existingExperienceResults.length === rawExperiences.length
    ) {
      onProgress?.(0.1, '使用已解析的经历结果...');
      mappedExperiences = rawExperiences.map((exp, i) => ({
        input: exp,
        result: existingExperienceResults![i],
      }));
    } else {
      for (let i = 0; i < rawExperiences.length; i++) {
        const exp = rawExperiences[i];
        const progress = 0.1 + (i / rawExperiences.length) * 0.4;
        onProgress?.(progress, `正在解析经历 #${i + 1}...`);

        const result = await mapSingleExperience(exp.content, i, jdContext);
        mappedExperiences.push({ input: exp, result });
      }
    }
  }

  onProgress?.(0.6, '分析技能匹配度...');

  const gapAnalysis = await analyzeSkillGaps(aggregatedProfile, mappedExperiences);

  onProgress?.(0.95, '完成差距分析');

  return gapAnalysis;
}

export function calculateSimpleCoverage(
  gapAnalysis: GapAnalysisResult
): { overallCoverage: number; criticalGaps: string[]; improvements: string[] } {
  const criticalGaps = gapAnalysis.criticalGaps;
  const highPriorityGaps = gapAnalysis.highPriorityGaps;

  const improvements: string[] = [];

  if (criticalGaps.length > 0) {
    improvements.push(`重点弥补 ${criticalGaps.length} 项关键差距`);
  }
  if (highPriorityGaps.length > 0) {
    improvements.push(`加强 ${highPriorityGaps.length} 项高优先级技能`);
  }

  // 添加具体的改进建议
  const uncoveredSkills = gapAnalysis.skillGaps.filter((g) => !g.isCovered && g.isRequired);
  if (uncoveredSkills.length > 0) {
    uncoveredSkills.slice(0, 3).forEach((s) => {
      if (s.suggestion) {
        improvements.push(s.suggestion);
      }
    });
  }

  return {
    overallCoverage: gapAnalysis.overallCoverage,
    criticalGaps,
    improvements: improvements.slice(0, 5),
  };
}
