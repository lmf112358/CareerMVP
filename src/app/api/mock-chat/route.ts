import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { openai, defaultModel } from '@/lib/ai';
import { z } from 'zod';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, interviewType = 'general', jdContext, experienceContext } = z
      .object({
        messages: z.array(
          z.object({
            role: z.enum(['user', 'assistant', 'system']),
            content: z.string(),
          })
        ),
        interviewType: z.enum(['general', 'hr', 'technical', 'stress']).optional(),
        jdContext: z.string().optional(),
        experienceContext: z.string().optional(),
      })
      .parse(body);

    const interviewPersonality = {
      general: '一位专业但友善的面试官，关注综合能力和岗位匹配度',
      hr: 'HR 面试官，关注行为面试、价值观、稳定性、职业规划',
      technical: '技术面试官，深入追问技术细节、项目难点、方案选型',
      stress: '压力面面试官，刻意制造紧张感，追问弱点、失败经历、边界情况',
    };

    const systemBase = `你是${interviewPersonality[interviewType]}。

你正在进行一场模拟面试。请：
1. 一次只问 1 个问题，不要一次问多个
2. 根据用户回答继续追问或转向下一个维度
3. 适当挑战用户：当回答模糊、缺乏数据、逻辑不严谨时，礼貌但尖锐地追问
4. 保持面试官的专业语气，不要过于随意

当用户说"结束面试"或类似意思时，请总结本次面试并邀请用户获取反馈。`;

    const contextParts: string[] = [];
    if (jdContext) {
      contextParts.push(`参考岗位背景（JD）：\n${jdContext}`);
    }
    if (experienceContext) {
      contextParts.push(`参考用户经历背景：\n${experienceContext}`);
    }
    const systemWithContext = contextParts.length
      ? `${systemBase}\n\n---\n${contextParts.join('\n\n---\n')}`
      : systemBase;

    const effectiveMessages = [
      { role: 'system' as const, content: systemWithContext },
      ...messages.filter((m) => m.role !== 'system'),
    ];

    const result = await streamText({
      model: openai(defaultModel),
      messages: effectiveMessages,
      temperature: 0.7,
      maxTokens: 800,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('rate limit') || message.includes('429')) {
      return new Response(
        `data: 0:"模型请求过于频繁，请稍后重试"\n\ndata: [DONE]\n`,
        { status: 429, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    return new Response(
      `data: 0:"模拟对话暂时失败，请稍后重试"\n\ndata: [DONE]\n`,
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}
