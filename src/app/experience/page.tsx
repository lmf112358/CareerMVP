'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Loader2, ArrowRight, CheckCircle2, Copy, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressStore } from '@/store/useProgressStore';
import type { ExperienceMap } from '@/lib/schemas';

export default function ExperiencePage() {
  const router = useRouter();
  const [experienceText, setExperienceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExperienceMap | null>(null);
  const [copied, setCopied] = useState(false);

  const jdResult = useProgressStore((s) => s.jdResult);
  const setExperienceResult = useProgressStore((s) => s.setExperienceResult);

  const handleMap = async () => {
    if (!experienceText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: { experience: string; jdContext?: string } = { experience: experienceText.trim() };
      if (jdResult) {
        body.jdContext = JSON.stringify(jdResult);
      }

      const res = await fetch('/api/experience-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '映射失败');
      }

      setResult(data);
      await setExperienceResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '映射失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLine = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.resume_line).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 font-medium mb-2">
          <Briefcase className="w-4 h-4" />
          模块 02
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">经历显影器</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          用 STAR 法则重构你的经历，让面试官一眼看到你的价值
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            描述一段你的经历（项目 / 实习 / 社团 / 竞赛均可）
          </label>
          <textarea
            value={experienceText}
            onChange={(e) => setExperienceText(e.target.value)}
            placeholder="例如：大二的时候我在学生会做过一次招新活动，大概来了 200 多个人，最后招了 30 个新人。我主要负责设计宣传海报和现场签到。感觉整体效果还可以，但也有些问题，比如有些部门报名的人太多，有些又太少..."
            className="w-full h-48 resize-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
          />
          {jdResult && (
            <div className="mt-3 text-xs text-green-600 dark:text-green-400">
              ✨ 已检测到 JD 解析结果，将自动对齐岗位需求
            </div>
          )}
          <div className="mt-4 flex items-center justify-end">
            <button
              onClick={handleMap}
              disabled={loading || !experienceText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-500/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在重构...
                </>
              ) : (
                <>
                  用 STAR 重构
                  <Star className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 px-5 py-4 text-sm text-red-700 dark:text-red-400"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">重构结果</h2>
              </div>

              <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    🏆 简历核心话术（建议直接复制使用）
                  </h3>
                  <button
                    onClick={handleCopyLine}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-800/30 text-amber-800 dark:text-amber-200 text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-700/40 transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <p className="text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                  {result.resume_line}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">可迁移能力标签</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.transferable_skills.map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex px-2.5 py-1 rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">原始描述</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-6">
                    {result.original}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  ⭐ STAR 结构优化版（建议收藏）
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: 'situation', label: '情境 (Situation)', desc: '当时的背景和挑战' },
                    { key: 'task', label: '任务 (Task)', desc: '你的目标和职责' },
                    { key: 'action', label: '行动 (Action)', desc: '你具体做了什么' },
                    { key: 'result', label: '结果 (Result)', desc: '最终的成果和数据' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-950/50"
                    >
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                          {item.label.split(' ')[0]}
                        </span>
                        <span className="text-xs text-gray-500">{item.desc}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {result.optimized[item.key as keyof typeof result.optimized]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => router.push('/sprint')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
                >
                  下一步：生成我的冲刺计划
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
