import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { defaultGenerateOptions, openai, defaultModel } from '@/lib/ai';
import { SprintPlanSchema } from '@/lib/schemas';
import { z } from 'zod';

const MAX_RETRIES = 2;

async function callLLMWithRetry(
  jdResult: string,
  experienceResult?: string,
  retries = MAX_RETRIES
): Promise<z.infer<typeof SprintPlanSchema>> {
  const experienceHint = experienceResult
    ? `\n用户已有经历映射（用于计算缺口）：\n${experienceResult}`
    : '';

  try {
    const result = await generateObject({
      ...defaultGenerateOptions,
      model: openai(defaultModel),
      schema: SprintPlanSchema,
      prompt: `你是一位职业规划师和学习路径设计师。

请基于以下 JD 解析结果（和可选的经历映射），生成一个 4 周的"信心冲刺计划"。

要求：
- 每周一个主题（theme）
- 每周包含 2-3 个微任务（tasks）
- 每个任务必须包含：
  - id: 唯一标识（如 week1-task1）
  - title: 简短标题
  - description: 详细描述
  - resources: 0-3 个学习资源（尽量推荐官方文档、免费视频或知名教程）
  - deliverable_type: 交付物类型描述（如"用 Excel 做一次数据透视表并截图"）
  - completed: false

- 任务设计原则：
  1. 微步可执行：每步 30-60 分钟可完成
  2. 可交付证据：每个任务都有明确的交付物
  3. 信心递增：从易到难，从输入到输出
  4. 缺口导向：优先补齐与目标岗位的能力差距

JD 解析结果：
${jdResult}${experienceHint}`,
    });
    return result.object;
  } catch (error) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1000 * (MAX_RETRIES - retries + 1)));
      return callLLMWithRetry(jdResult, experienceResult, retries - 1);
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jdResult, experienceResult } = z
      .object({
        jdResult: z.string().min(50),
        experienceResult: z.string().optional(),
      })
      .parse(body);

    const result = await callLLMWithRetry(jdResult, experienceResult);
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
      { error: '冲刺计划生成暂时失败，请稍后重试', retry: true },
      { status: 500 }
    );
  }
}
