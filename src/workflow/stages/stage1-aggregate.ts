import { generateObject } from 'ai';
import { defaultGenerateOptions, openai, defaultModel } from '@/lib/ai';
import {
  JDOutputSchema,
  AggregatedJDProfileSchema,
  RawJDInput,
  JDOutput,
  AggregatedJDProfile,
} from '@/lib/schemas';
import type { WorkflowContext } from '../types';

const MAX_RETRIES = 2;

export interface Stage1Progress {
  currentStep: string;
  stepProgress: number;
  totalSteps: number;
}

async function parseSingleJD(
  jdContent: string,
  index: number
): Promise<JDOutput> {
  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      const result = await generateObject({
        ...defaultGenerateOptions,
        model: openai(defaultModel),
        schema: JDOutputSchema,
        prompt: `你是一位资深业务负责人和职业规划师。

请将以下招聘要求（JD）翻译为严格符合 JSON Schema 的结构化信息。

要求：
1. core_actions：提取岗位核心工作动作（不超过 8 项）
2. mvs_skills：
   - hard：技术硬技能（编程语言、工具、框架、专业知识）
   - soft：软技能（沟通、协作、问题解决、学习能力等）
3. hidden_risks：岗位隐含的挑战或风险（如加班多、要求快速上手、指标压力大等）
4. weekly_proof：生成 4 周能力准备计划，每周输出 1-3 个可落地任务

以下是 JD 原文（JD #${index + 1}）：
${jdContent}`,
      });

      return result.object;
    } catch (error) {
      retries++;
      if (retries > MAX_RETRIES) {
        throw new Error(`JD #${index + 1} 解析失败: ${error instanceof Error ? error.message : String(error)}`);
      }
      await new Promise((r) => setTimeout(r, 1000 * retries));
    }
  }

  throw new Error(`JD #${index + 1} 解析失败，重试次数用完`);
}

async function aggregateJDResults(
  parsedResults: { jd: RawJDInput; result: JDOutput }[]
): Promise<AggregatedJDProfile> {
  const jdCount = parsedResults.length;
  const sourceTitles = parsedResults.map((r) => r.jd.title || `JD #${parsedResults.indexOf(r) + 1}`);

  const result = await generateObject({
    ...defaultGenerateOptions,
    model: openai(defaultModel),
    schema: AggregatedJDProfileSchema,
    prompt: `你是一位职业规划专家和数据分析师。

我有 ${jdCount} 个不同公司/岗位的产品经理 JD 解析结果。请分析这些结果，生成一个聚合后的岗位能力画像。

## 分析要求

### 1. 共同要求 (commonSkills, commonCoreActions, commonHiddenRisks)
- 找出所有 JD 中共同要求的硬技能和软技能
- 找出共同的核心工作动作
- 找出共同的隐藏风险

### 2. 差异分析 (differentiatedSkills)
- 对于每个 JD，分析它独有的技能要求
- 描述每个 JD 的侧重点有什么不同

### 3. 优先级矩阵 (priorityMatrix)
- 综合所有 JD，给每个技能分配优先级
- 优先级：Critical (必须有) / High (非常重要) / Medium (最好有) / Low (加分项)
- 说明为什么这个优先级

### 4. 能力向量 (unifiedCapabilityVector)
- 将技能聚合为几个核心能力维度
- 每个维度需要达到的水平：Basic / Intermediate / Advanced

## 各 JD 解析结果

${parsedResults
  .map(
    (r, i) => `
### JD #${i + 1}: ${sourceTitles[i]}

**核心动作：**
${r.result.core_actions.map((a) => `- ${a}`).join('\n')}

**硬技能：**
${r.result.mvs_skills.hard.join('、')}

**软技能：**
${r.result.mvs_skills.soft.join('、')}

**隐藏风险：**
${r.result.hidden_risks.map((r) => `- ${r}`).join('\n')}
`
  )
  .join('\n---\n')}

请基于以上信息，生成聚合后的岗位能力画像。`,
  });

  return result.object;
}

export async function executeStage1(
  context: WorkflowContext,
  onProgress?: (progress: number, message: string) => void
): Promise<AggregatedJDProfile> {
  const { rawJDs, existingJdResults } = context.input;
  const jdCount = rawJDs.length;

  onProgress?.(0.05, `开始分析 ${jdCount} 个 JD...`);

  let parsedResults: { jd: RawJDInput; result: JDOutput }[];

  if (existingJdResults && existingJdResults.length === rawJDs.length) {
    onProgress?.(0.3, '使用已解析的 JD 结果...');
    parsedResults = rawJDs.map((jd, i) => ({
      jd,
      result: existingJdResults![i],
    }));
  } else {
    parsedResults = [];

    for (let i = 0; i < rawJDs.length; i++) {
      const jd = rawJDs[i];
      const progress = 0.1 + (i / rawJDs.length) * 0.5;
      onProgress?.(progress, `正在解析 JD #${i + 1}...`);

      const result = await parseSingleJD(jd.content, i);
      parsedResults.push({ jd, result });
    }
  }

  onProgress?.(0.6, '聚合所有 JD 的共同要求...');

  const aggregated = await aggregateJDResults(parsedResults);

  onProgress?.(0.95, '完成 JD 聚合分析');

  return aggregated;
}

export function stage1ToSimpleJDOutput(
  aggregated: AggregatedJDProfile
): JDOutput {
  return {
    core_actions: aggregated.commonCoreActions,
    mvs_skills: aggregated.commonSkills,
    hidden_risks: aggregated.commonHiddenRisks,
    weekly_proof: [
      { week: 1, task: '熟悉岗位核心要求', proof_type: '文档' },
      { week: 2, task: '针对性学习关键技能', proof_type: '代码' },
      { week: 3, task: '项目实战练手', proof_type: '截图' },
      { week: 4, task: '模拟面试准备', proof_type: '文档' },
    ],
  };
}
