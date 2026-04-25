import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { defaultGenerateOptions, openai, defaultModel } from '@/lib/ai';
import { ExperienceMapSchema } from '@/lib/schemas';
import { z } from 'zod';

const MAX_RETRIES = 2;

async function callLLMWithRetry(
  experience: string,
  jdContext?: string,
  retries = MAX_RETRIES
): Promise<z.infer<typeof ExperienceMapSchema>> {
  const contextHint = jdContext
    ? `\n参考 JD 背景（可选对齐）：\n${jdContext}`
    : '';

  try {
    const result = await generateObject({
      ...defaultGenerateOptions,
      model: openai(defaultModel),
      schema: ExperienceMapSchema,
      prompt: `你是一位专业的简历优化师和面试官。

请将以下用户经历按照 STAR 法则重构，并输出优化前后对比、可迁移能力标签、以及一句简历核心话术。

要求：
1. optimized：严格的 STAR 结构
   - situation：背景/情境
   - task：任务/目标
   - action：具体行动（突出个人贡献）
   - result：可量化结果（如不确定，可留占位符如"提升 20%"）
2. transferable_skills：提取可迁移能力标签（如项目管理、数据分析、跨部门协作、快速学习）
3. resume_line：1 句话简历核心描述（动词开头、结果导向）
4. original：保留用户原始输入

用户经历原文：
${experience}${contextHint}`,
    });
    return result.object;
  } catch (error) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1000 * (MAX_RETRIES - retries + 1)));
      return callLLMWithRetry(experience, jdContext, retries - 1);
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { experience, jdContext } = z
      .object({
        experience: z.string().min(10).max(5000),
        jdContext: z.string().optional(),
      })
      .parse(body);

    const result = await callLLMWithRetry(experience, jdContext);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: `输入校验失败: ${message}`, retry: false }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('rate limit') || message.includes('429')) {
      return NextResponse.json(
        { error: '模型请求过于频繁，请稍后重试', retry: true, retryAfter: 60 },
        { status: 429 }
      );
    }

    if (message.includes('API key') || message.includes('Unauthorized') || message.includes('401')) {
      return NextResponse.json(
        { error: '模型服务未配置或密钥无效，请联系管理员', retry: false },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '经历映射暂时失败，请稍后重试', retry: true },
      { status: 500 }
    );
  }
}
