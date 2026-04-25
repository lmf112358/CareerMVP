import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { defaultGenerateOptions, openai, defaultModel } from '@/lib/ai';
import { MockFeedbackSchema } from '@/lib/schemas';
import { z } from 'zod';

const MAX_RETRIES = 2;

async function callLLMWithRetry(
  messages: Array<{ role: string; content: string }>,
  jdContext?: string,
  retries = MAX_RETRIES
): Promise<z.infer<typeof MockFeedbackSchema>> {
  const transcript = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => `[${m.role === 'user' ? '求职者' : '面试官'}]: ${m.content}`)
    .join('\n\n');

  const contextHint = jdContext ? `\n参考岗位背景（JD）：\n${jdContext}` : '';

  try {
    const result = await generateObject({
      ...defaultGenerateOptions,
      model: openai(defaultModel),
      schema: MockFeedbackSchema,
      prompt: `你是一位资深面试官和职业教练。

请基于以下面试对话记录，给出结构化反馈。

要求：
1. score：0-100 的综合评分
2. strengths：2-4 个优点（如逻辑清晰、数据意识强、沟通顺畅）
3. weaknesses：1-3 个可改进点（如结果未量化、缺乏复盘视角、STAR 不完整）
4. optimized_star：选择一段用户表现最典型的回答，用 STAR 结构重构一个更优版本

注意：
- 反馈要具体，基于对话中的实际表现，不要空泛
- 优点要具体到哪段回答体现了什么
- 缺点要给出可落地的改进方向

面试对话记录：
${transcript}${contextHint}`,
    });
    return result.object;
  } catch (error) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1000 * (MAX_RETRIES - retries + 1)));
      return callLLMWithRetry(messages, jdContext, retries - 1);
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, jdContext } = z
      .object({
        messages: z.array(
          z.object({
            role: z.enum(['user', 'assistant', 'system']),
            content: z.string(),
          })
        ),
        jdContext: z.string().optional(),
      })
      .parse(body);

    const userMessages = messages.filter((m) => m.role === 'user');
    if (userMessages.length === 0) {
      return NextResponse.json(
        { error: '暂无面试记录可供反馈', retry: false },
        { status: 400 }
      );
    }

    const result = await callLLMWithRetry(messages, jdContext);
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
      { error: '反馈生成暂时失败，请稍后重试', retry: true },
      { status: 500 }
    );
  }
}
