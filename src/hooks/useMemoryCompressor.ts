import { Message } from 'ai';

export function compressHistory(
  messages: Message[],
  maxMessages = 12,
  keepRecent = 6
): Message[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  const systemMessages = messages.filter((m) => m.role === 'system');
  const nonSystem = messages.filter((m) => m.role !== 'system');

  if (nonSystem.length <= keepRecent) {
    return messages;
  }

  const toCompress = nonSystem.slice(0, nonSystem.length - keepRecent);
  const recent = nonSystem.slice(nonSystem.length - keepRecent);

  const summary: Message = {
    id: 'compressed-' + Date.now(),
    role: 'assistant',
    content: `[历史摘要] 此前共有 ${toCompress.length} 轮对话，包含：${toCompress
      .filter((m) => m.role === 'user')
      .slice(0, 3)
      .map((m) => m.content.slice(0, 80))
      .join('；')}...（后续对话已保留上下文继续）`,
    createdAt: new Date(),
  };

  return [...systemMessages, summary, ...recent];
}

export function buildInterviewSystemPrompt(
  interviewType: 'general' | 'hr' | 'technical' | 'stress',
  jdContext?: string,
  experienceContext?: string
): string {
  const interviewPersonality = {
    general: '一位专业但友善的面试官，关注综合能力和岗位匹配度',
    hr: 'HR 面试官，关注行为面试、价值观、稳定性、职业规划',
    technical: '技术面试官，深入追问技术细节、项目难点、方案选型',
    stress: '压力面面试官，刻意制造紧张感，追问弱点、失败经历、边界情况',
  };

  const base = `你是${interviewPersonality[interviewType]}。

你正在进行一场模拟面试。请：
1. 一次只问 1 个问题，不要一次问多个
2. 根据用户回答继续追问或转向下一个维度
3. 适当挑战用户：当回答模糊、缺乏数据、逻辑不严谨时，礼貌但尖锐地追问
4. 保持面试官的专业语气，不要过于随意

当用户说"结束面试"或类似意思时，请总结本次面试并邀请用户获取反馈。`;

  const parts: string[] = [];
  if (jdContext) {
    parts.push(`参考岗位背景（JD）：\n${jdContext}`);
  }
  if (experienceContext) {
    parts.push(`参考用户经历背景：\n${experienceContext}`);
  }

  return parts.length ? `${base}\n\n---\n${parts.join('\n\n---\n')}` : base;
}
