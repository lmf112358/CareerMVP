'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ArrowRight, CheckCircle2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressStore } from '@/store/useProgressStore';
import type { JDOutput } from '@/lib/schemas';

export default function JDParserPage() {
  const router = useRouter();
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JDOutput | null>(null);
  const [copied, setCopied] = useState(false);

  const setJdResult = useProgressStore((s) => s.setJdResult);

  const handleParse = async () => {
    if (!jdText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/jd-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: jdText.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '解析失败');
      }

      setResult(data);
      await setJdResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `# JD 解析结果\n\n## 核心动作\n${result.core_actions.map((a) => `- ${a}`).join('\n')}\n\n## 技能要求\n- 硬技能：${result.mvs_skills.hard.join('、')}\n- 软技能：${result.mvs_skills.soft.join('、')}\n\n## 隐藏风险\n${result.hidden_risks.map((r) => `- ${r}`).join('\n')}\n\n## 4 周准备计划\n${result.weekly_proof
      .map(
        (w) =>
          `\n### 第 ${w.week} 周\n- 任务：${w.task}\n- 交付物：${w.proof_type}`
      )
      .join('')}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 font-medium mb-2">
          <Search className="w-4 h-4" />
          模块 01
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">JD 透视镜</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          把模糊的招聘要求拆解为可执行的能力地图
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            粘贴目标岗位的 JD（招聘要求）
          </label>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="例如：我们正在寻找一位产品经理，负责用户增长模块，需要 2 年以上 B 端产品经验，熟练使用 Axure、Figma，有数据分析能力，具备跨部门沟通和项目管理能力..."
            className="w-full h-40 resize-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
          />
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">{jdText.length} 字符</div>
            <button
              onClick={handleParse}
              disabled={loading || !jdText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-500/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在解析...
                </>
              ) : (
                <>
                  开始解构
                  <ArrowRight className="w-4 h-4" />
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">解析结果</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? '已复制' : '复制 Markdown'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">核心工作动作</h3>
                  <ul className="space-y-1.5">
                    {result.core_actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">技能要求</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-1.5">硬技能</div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.mvs_skills.hard.map((skill, i) => (
                          <span
                            key={i}
                            className="inline-flex px-2 py-1 rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-1.5">软技能</div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.mvs_skills.soft.map((skill, i) => (
                          <span
                            key={i}
                            className="inline-flex px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">隐藏风险 & 注意事项</h3>
                <ul className="space-y-1.5">
                  {result.hidden_risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">4 周准备计划</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((week) => {
                    const tasks = result.weekly_proof.filter((w) => w.week === week);
                    return (
                      <div
                        key={week}
                        className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-950/50"
                      >
                        <div className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-2">
                          第 {week} 周
                        </div>
                        {tasks.length === 0 ? (
                          <div className="text-xs text-gray-400">暂无任务</div>
                        ) : (
                          <ul className="space-y-2">
                            {tasks.map((task, i) => (
                              <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                                <div className="font-medium">{task.task}</div>
                                <div className="mt-1 text-xs text-gray-500">
                                  交付物：{task.proof_type}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => router.push('/experience')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
                >
                  下一步：去翻译我的经历
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
