'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Loader2, ArrowRight, CheckCircle2, ChevronRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressStore } from '@/store/useProgressStore';

export default function SprintPage() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState(1);

  const jdResult = useProgressStore((s) => s.jdResult);
  const experienceResult = useProgressStore((s) => s.experienceResult);
  const sprintPlan = useProgressStore((s) => s.sprintPlan);
  const taskCompletion = useProgressStore((s) => s.taskCompletion);
  const setSprintPlan = useProgressStore((s) => s.setSprintPlan);
  const toggleTask = useProgressStore((s) => s.toggleTask);
  const load = useProgressStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const totalTasks = sprintPlan?.reduce((acc, week) => acc + week.tasks.length, 0) || 0;
  const completedTasks = sprintPlan
    ? sprintPlan.reduce(
        (acc, week) =>
          acc + week.tasks.filter((t) => taskCompletion[t.id] ?? t.completed).length,
        0
      )
    : 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleGenerate = async () => {
    if (!jdResult) {
      setError('请先完成「JD 透视镜」模块，再生成冲刺计划');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const body: { jdResult: string; experienceResult?: string } = { jdResult: JSON.stringify(jdResult) };
      if (experienceResult) {
        body.experienceResult = JSON.stringify(experienceResult);
      }

      const res = await fetch('/api/sprint-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '生成失败');
      }

      await setSprintPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    await toggleTask(taskId);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 font-medium mb-2">
          <Calendar className="w-4 h-4" />
          模块 03
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">4 周信心冲刺</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          基于能力缺口生成可执行的微任务计划，每一步都有明确的交付物
        </p>
      </div>

      <div className="space-y-6">
        {sprintPlan ? (
          <>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">总体进度</div>
                <div className="text-sm text-gray-500">
                  {completedTasks} / {totalTasks} 任务
                </div>
              </div>
              <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-primary-500 rounded-full"
                />
              </div>
              {progress >= 100 && (
                <div className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">
                  🎉 恭喜！你已完成所有冲刺任务
                </div>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {sprintPlan.map((week) => {
                const weekCompleted = week.tasks.filter(
                  (t) => taskCompletion[t.id] ?? t.completed
                ).length;
                const weekTotal = week.tasks.length;

                return (
                  <button
                    key={week.week}
                    onClick={() => setActiveWeek(week.week)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeWeek === week.week
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div>第 {week.week} 周</div>
                    <div className="text-xs opacity-75 mt-0.5">
                      {week.theme} · {weekCompleted}/{weekTotal}
                    </div>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {sprintPlan
                .filter((w) => w.week === activeWeek)
                .map((week) => (
                  <motion.div
                    key={week.week}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        第 {week.week} 周：{week.theme}
                      </h2>
                    </div>

                    {week.tasks.map((task) => {
                      const isCompleted = taskCompletion[task.id] ?? task.completed;

                      return (
                        <div
                          key={task.id}
                          className={`rounded-xl border p-5 transition-colors ${
                            isCompleted
                              ? 'border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10'
                              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                isCompleted
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300 dark:border-gray-700 hover:border-primary-500'
                              }`}
                            >
                              {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3
                                  className={`text-sm font-semibold ${
                                    isCompleted
                                      ? 'text-green-800 dark:text-green-200 line-through'
                                      : 'text-gray-900 dark:text-white'
                                  }`}
                                >
                                  {task.title}
                                </h3>
                              </div>
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {task.description}
                              </p>

                              {task.resources.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-xs font-medium text-gray-500 mb-1.5">学习资源</div>
                                  <div className="flex flex-wrap gap-2">
                                    {task.resources.map((resource, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium"
                                      >
                                        {resource.type} · {resource.title}
                                        {resource.url && <ExternalLink className="w-3 h-3" />}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
                                <ChevronRight className="w-3 h-3" />
                                交付物：{task.deliverable_type}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                ))}
            </AnimatePresence>

            <div className="flex justify-center">
              <button
                onClick={() => router.push('/mock')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
              >
                下一步：来一次模拟面试
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center">
            {!jdResult ? (
              <>
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  请先完成「JD 透视镜」
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  冲刺计划需要基于目标岗位的能力要求生成
                </p>
                <button
                  onClick={() => router.push('/jd-parser')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  去拆解 JD
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Calendar className="w-12 h-12 text-primary-300 dark:text-primary-700 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  生成你的专属冲刺计划
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  基于你目标岗位的能力要求，自动计算缺口并生成 4 周微任务计划
                </p>
                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 px-4 py-2 text-sm text-red-700 dark:text-red-400">
                    ⚠️ {error}
                  </div>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg shadow-primary-500/20"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      正在生成计划...
                    </>
                  ) : (
                    <>
                      生成 4 周冲刺计划
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
