'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, Loader2, RefreshCw, ArrowRight, CheckCircle2, Trash2, Star } from 'lucide-react';
import { useChat } from 'ai/react';
import { compressHistory } from '@/hooks/useMemoryCompressor';
import { useProgressStore } from '@/store/useProgressStore';
import type { MockFeedback } from '@/lib/schemas';

const INTERVIEW_TYPES = [
  { id: 'general', label: '综合面', description: '全面评估综合素质和岗位匹配' },
  { id: 'hr', label: 'HR 面', description: '行为面试、价值观、职业规划' },
  { id: 'technical', label: '技术面', description: '深入追问技术细节和项目经验' },
  { id: 'stress', label: '压力面', description: '刻意挑战，测试抗压和边界处理' },
] as const;

export default function MockPage() {
  const [interviewType, setInterviewType] = useState<'general' | 'hr' | 'technical' | 'stress'>('general');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<MockFeedback | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const jdResult = useProgressStore((s) => s.jdResult);
  const experienceResult = useProgressStore((s) => s.experienceResult);
  const latestFeedback = useProgressStore((s) => s.latestFeedback);
  const setLatestFeedback = useProgressStore((s) => s.setLatestFeedback);
  const load = useProgressStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error: chatError,
    stop,
    reload,
    setMessages,
  } = useChat({
    api: '/api/mock-chat',
    id: 'mock-interview',
    body: {
      interviewType,
      jdContext: jdResult ? JSON.stringify(jdResult) : undefined,
      experienceContext: experienceResult ? JSON.stringify(experienceResult) : undefined,
    },
    onFinish: () => {},
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStart = () => {
    setStarted(true);
    setFinished(false);
    setFeedback(null);
    setFeedbackError(null);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          interviewType === 'stress'
            ? '你好，请坐。我们开始吧。先做个自我介绍，给你 1 分钟。'
            : '你好，欢迎参加今天的模拟面试。我是今天的面试官。我们先从一个简单的问题开始：请先做一下自我介绍吧。',
        createdAt: new Date(),
      },
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const effectiveMessages = compressHistory(messages, 16, 8);

    if (input.trim().includes('结束面试') || input.trim().includes('结束吧')) {
      setFinished(true);
      setMessages([
        ...effectiveMessages,
        {
          id: Date.now().toString(),
          role: 'user',
          content: input.trim(),
          createdAt: new Date(),
        },
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '好的，面试到此结束。感谢你的参与。现在点击下方按钮获取面试反馈。',
          createdAt: new Date(),
        },
      ]);
      return;
    }

    originalHandleSubmit(e);
  };

  const handleGetFeedback = async () => {
    setGeneratingFeedback(true);
    setFeedbackError(null);

    try {
      const body: { messages: Array<{ role: string; content: string }>; jdContext?: string } = { messages };
      if (jdResult) {
        body.jdContext = JSON.stringify(jdResult);
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '反馈生成失败');
      }

      setFeedback(data);
      await setLatestFeedback(data);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : '反馈生成失败，请稍后重试');
    } finally {
      setGeneratingFeedback(false);
    }
  };

  const handleReset = () => {
    setStarted(false);
    setFinished(false);
    setFeedback(null);
    setFeedbackError(null);
    setMessages([]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 font-medium mb-2">
          <MessageSquare className="w-4 h-4" />
          模块 04
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">实战模拟舱</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          多角色模拟面试，结束后自动生成结构化反馈和改进建议
        </p>
      </div>

      <div className="space-y-6">
        {!started ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">选择面试类型</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {INTERVIEW_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setInterviewType(type.id)}
                  className={`text-left p-4 rounded-lg border transition-colors ${
                    interviewType === type.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div
                    className={`text-sm font-semibold ${
                      interviewType === type.id
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                </button>
              ))}
            </div>

            {(jdResult || experienceResult) && (
              <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 px-4 py-2 text-sm text-green-700 dark:text-green-300">
                ✨ 已检测到 {jdResult ? 'JD 解析结果' : ''} {jdResult && experienceResult ? '和' : ''}
                {experienceResult ? '经历映射' : ''}，将自动注入面试上下文
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                onClick={handleStart}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
              >
                开始模拟面试
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {latestFeedback && (
              <div className="mt-6">
                <div className="text-sm font-medium text-gray-500 mb-2">最近一次面试反馈</div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {latestFeedback.score}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">综合评分</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {latestFeedback.strengths.length} 个优点 · {latestFeedback.weaknesses.length} 个改进点
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {INTERVIEW_TYPES.find((t) => t.id === interviewType)?.label} 进行中
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isLoading && (
                  <button
                    onClick={stop}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  >
                    停止生成
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  重新开始
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="h-96 sm:h-[500px] overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-primary-600 text-white rounded-tr-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary-600 dark:text-primary-400">你</span>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-800 px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-sm text-red-700 dark:text-red-400">
                      ⚠️ 连接出错，请重试
                      <button
                        onClick={() => reload()}
                        className="inline-flex items-center gap-1 text-xs underline"
                      >
                        <RefreshCw className="w-3 h-3" />
                        重试
                      </button>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {!finished ? (
                <div className="border-t border-gray-200 dark:border-gray-800 p-3">
                  <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input
                      value={input}
                      onChange={handleInputChange}
                      placeholder="输入你的回答...（说「结束面试」可终止）"
                      disabled={isLoading}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="border-t border-gray-200 dark:border-gray-800 p-4">
                  {feedback ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          面试反馈
                        </h3>
                      </div>

                      <div className="rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">综合评分</div>
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                            {feedback.score}
                            <span className="text-sm text-gray-400 ml-1">/ 100</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10 p-4">
                          <div className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider mb-2">
                            优点
                          </div>
                          <ul className="space-y-1.5">
                            {feedback.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-200">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-lg border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                          <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2">
                            改进点
                          </div>
                          <ul className="space-y-1.5">
                            {feedback.weaknesses.map((w, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                        <div className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-3">
                          ⭐ 优化后的 STAR 参考（典型回答）
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            { key: 'situation', label: '情境' },
                            { key: 'task', label: '任务' },
                            { key: 'action', label: '行动' },
                            { key: 'result', label: '结果' },
                          ].map((item) => (
                            <div key={item.key}>
                              <div className="text-xs font-medium text-gray-500 mb-1">{item.label}</div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {feedback.optimized_star[item.key as keyof typeof feedback.optimized_star]}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <button
                          onClick={handleReset}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                        >
                          再来一次模拟面试
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      {feedbackError && (
                        <div className="mb-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-sm text-red-700 dark:text-red-400">
                          ⚠️ {feedbackError}
                        </div>
                      )}
                      <div>
                        <button
                          onClick={handleGetFeedback}
                          disabled={generatingFeedback}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg shadow-primary-500/20"
                        >
                          {generatingFeedback ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              正在生成反馈...
                            </>
                          ) : (
                            <>
                              获取面试反馈
                              <Star className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
