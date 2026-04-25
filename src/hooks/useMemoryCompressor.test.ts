import { describe, it, expect } from 'vitest';
import { compressHistory, buildInterviewSystemPrompt } from './useMemoryCompressor';
import type { Message } from 'ai';

const createMessage = (role: 'user' | 'assistant' | 'system', content: string): Message => ({
  id: Math.random().toString(),
  role,
  content,
  createdAt: new Date(),
});

describe('compressHistory', () => {
  it('should return messages unchanged if under maxMessages', () => {
    const messages = [
      createMessage('user', '你好'),
      createMessage('assistant', '你好，有什么可以帮你？'),
    ];

    const result = compressHistory(messages, 10, 6);

    expect(result.length).toBe(2);
    expect(result[0].content).toBe('你好');
    expect(result[1].content).toBe('你好，有什么可以帮你？');
  });

  it('should keep system messages', () => {
    const messages = [
      createMessage('system', '你是一个面试官'),
      createMessage('user', '你好'),
      createMessage('assistant', '你好，请做自我介绍'),
      createMessage('user', '我是张三...'),
      createMessage('assistant', '好的，接下来问你一些技术问题...'),
    ];

    const result = compressHistory(messages, 4, 2);

    const systemMessages = result.filter((m) => m.role === 'system');
    expect(systemMessages.length).toBeGreaterThanOrEqual(1);
    expect(systemMessages[0].content).toBe('你是一个面试官');
  });

  it('should compress older messages when exceeding limit', () => {
    const messages: Message[] = [];
    for (let i = 0; i < 20; i++) {
      messages.push(createMessage('user', `用户消息 ${i + 1}`));
      messages.push(createMessage('assistant', `回复 ${i + 1}`));
    }

    const result = compressHistory(messages, 12, 6);

    expect(result.length).toBeLessThanOrEqual(13);
    const hasCompressed = result.some((m) => m.content.includes('[历史摘要]'));
    expect(hasCompressed).toBe(true);
  });

  it('should handle empty messages', () => {
    const result = compressHistory([], 10, 6);
    expect(result.length).toBe(0);
  });

  it('should handle only system messages', () => {
    const messages = [
      createMessage('system', '系统提示 1'),
      createMessage('system', '系统提示 2'),
    ];

    const result = compressHistory(messages, 10, 6);

    expect(result.length).toBe(2);
    expect(result[0].content).toBe('系统提示 1');
    expect(result[1].content).toBe('系统提示 2');
  });
});

describe('buildInterviewSystemPrompt', () => {
  it('should build prompt for general interview', () => {
    const prompt = buildInterviewSystemPrompt('general');

    expect(prompt).toContain('面试官');
    expect(prompt).toContain('综合能力');
  });

  it('should build prompt for HR interview', () => {
    const prompt = buildInterviewSystemPrompt('hr');

    expect(prompt).toContain('HR 面试官');
    expect(prompt).toContain('行为面试');
    expect(prompt).toContain('价值观');
    expect(prompt).toContain('职业规划');
  });

  it('should build prompt for technical interview', () => {
    const prompt = buildInterviewSystemPrompt('technical');

    expect(prompt).toContain('技术面试官');
    expect(prompt).toContain('技术细节');
    expect(prompt).toContain('项目难点');
  });

  it('should build prompt for stress interview', () => {
    const prompt = buildInterviewSystemPrompt('stress');

    expect(prompt).toContain('压力面');
    expect(prompt).toContain('刻意制造紧张感');
    expect(prompt).toContain('弱点');
    expect(prompt).toContain('失败经历');
    expect(prompt).toContain('适当挑战用户');
  });

  it('should include JD context when provided', () => {
    const jdContext = '招聘产品经理，要求 Axure、Figma、数据分析能力';
    const prompt = buildInterviewSystemPrompt('general', jdContext);

    expect(prompt).toContain('参考岗位背景');
    expect(prompt).toContain('产品经理');
    expect(prompt).toContain('Axure');
  });

  it('should include experience context when provided', () => {
    const expContext = '用户有学生会项目经验，负责过招新活动';
    const prompt = buildInterviewSystemPrompt('general', undefined, expContext);

    expect(prompt).toContain('参考用户经历背景');
    expect(prompt).toContain('学生会');
    expect(prompt).toContain('招新活动');
  });

  it('should include both contexts when provided', () => {
    const jdContext = 'JD 内容';
    const expContext = '经历内容';
    const prompt = buildInterviewSystemPrompt('general', jdContext, expContext);

    expect(prompt).toContain('参考岗位背景');
    expect(prompt).toContain('参考用户经历背景');
  });
});
