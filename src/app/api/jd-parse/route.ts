import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { defaultGenerateOptions, openai, defaultModel } from '@/lib/ai';
import { JDOutputSchema } from '@/lib/schemas';
import { z } from 'zod';

const MAX_RETRIES = 2;

async function callLLMWithRetry(text: string, retries = MAX_RETRIES): Promise<z.infer<typeof JDOutputSchema>> {
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
4. weekly_proof：生成 4 周能力准备计划，每周输出 1-3 个可落地任务，每个任务包含：
   - week: 1-4
   - task: 任务描述
   - proof_type: 截图 | 链接 | 文档 | 代码

以下是 JD 原文：
${text}`,
    });
    return result.object;
  } catch (error) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1000 * (MAX_RETRIES - retries + 1)));
      return callLLMWithRetry(text, retries - 1);
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = z.object({ text: z.string().min(20).max(15000) }).parse(body);

    const result = await callLLMWithRetry(text);
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
      { error: 'JD 解析暂时失败，请稍后重试', retry: true },
      { status: 500 }
    );
  }
}
