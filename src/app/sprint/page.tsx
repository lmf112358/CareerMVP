'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Loader2,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  Clock,
  BarChart3,
  Target,
  AlertCircle,
  RefreshCw,
  FileText,
  User,
  Settings,
  Play,
  Pause,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressStore } from '@/store/useProgressStore';
import type {
  SprintWorkflowOutput,
  UserPreferences,
  RawJDInput,
  RawExperienceInput,
} from '@/lib/schemas';
import type {
  WorkflowProgress,
  WorkflowError,
} from '@/workflow';

export default function SprintPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'input' | 'generating' | 'results'>('input');
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');

  const [jds, setJds] = useState<RawJDInput[]>([
    { id: 'jd-1', title: '', content: '' },
  ]);

  const [experiences, setExperiences] = useState<RawExperienceInput[]>([
    { id: 'exp-1', title: '', content: '' },
  ]);

  const [preferences, setPreferences] = useState<UserPreferences>({
    dailyHoursAvailable: 2,
    currentLevel: 'beginner',
    priorityStrategy: 'critical-first',
  });

  const [generatingStage, setGeneratingStage] = useState<number>(1);
  const [stageProgress, setStageProgress] = useState<number>(0);
  const [stageMessage, setStageMessage] = useState<string>('准备中...');
  const [completedStages, setCompletedStages] = useState<number[]>([]);

  const [result, setResult] = useState<SprintWorkflowOutput | null>(null);
  const [activeWeek, setActiveWeek] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<WorkflowError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    if (sprintPlan && sprintPlan.length > 0 && mode === 'input') {
      setMode('results');
      setActiveTab('results');
    }
  }, [sprintPlan, mode]);

  const totalTasks = sprintPlan?.reduce((acc, week) => acc + week.tasks.length, 0) || 0;
  const completedTasks = sprintPlan
    ? sprintPlan.reduce(
        (acc, week) =>
          acc + week.tasks.filter((t) => taskCompletion[t.id] ?? t.completed).length,
        0
      )
    : 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const addJD = () => {
    if (jds.length < 3) {
      setJds([...jds, { id: `jd-${Date.now()}`, title: '', content: '' }]);
    }
  };

  const removeJD = (id: string) => {
    if (jds.length > 1) {
      setJds(jds.filter((jd) => jd.id !== id));
    }
  };

  const updateJD = (id: string, field: 'title' | 'content', value: string) => {
    setJds(jds.map((jd) => (jd.id === id ? { ...jd, [field]: value } : jd)));
  };

  const addExperience = () => {
    setExperiences([...experiences, { id: `exp-${Date.now()}`, title: '', content: '' }]);
  };

  const removeExperience = (id: string) => {
    if (experiences.length > 0) {
      setExperiences(experiences.filter((e) => e.id !== id));
    }
  };

  const updateExperience = (id: string, field: 'title' | 'content', value: string) => {
    setExperiences(
      experiences.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const canGenerate = () => {
    const hasValidJD = jds.some((jd) => jd.content.trim().length >= 20);
    return hasValidJD && mode !== 'generating';
  };

  const parseSSEEvent = (line: string): { event: string; data: string } | null => {
    if (line.startsWith('event:')) {
      const event = line.replace('event:', '').trim();
      return { event, data: '' };
    }
    if (line.startsWith('data:')) {
      const data = line.replace('data:', '').trim();
      return { event: '', data };
    }
    return null;
  };

  const handleGenerate = async () => {
    const validJDs = jds.filter((jd) => jd.content.trim().length >= 20);
    const validExperiences = experiences.filter((e) => e.content.trim().length >= 10);

    if (validJDs.length === 0) {
      setError('请至少输入一个有效的 JD（至少 20 个字符）');
      return;
    }

    setMode('generating');
    setError(null);
    setErrorDetails(null);
    setGeneratingStage(1);
    setStageProgress(0);
    setStageMessage('准备中...');
    setCompletedStages([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/sprint-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          rawJDs: validJDs,
          rawExperiences: validExperiences.length > 0 ? validExperiences : undefined,
          preferences,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '请求失败' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let lastEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const parsed = parseSSEEvent(line);
          if (!parsed) continue;

          if (parsed.event) {
            lastEvent = parsed.event;
            continue;
          }

          if (parsed.data && lastEvent) {
            try {
              const data = JSON.parse(parsed.data);

              switch (lastEvent) {
                case 'stage-progress': {
                  const progressData = data as WorkflowProgress;
                  setGeneratingStage(progressData.stage);
                  setStageProgress(progressData.progress);
                  setStageMessage(progressData.message);
                  break;
                }

                case 'stage-complete': {
                  const stageId = data.stage as number;
                  setCompletedStages((prev) => [...prev, stageId]);
                  break;
                }

                case 'workflow-error': {
                  const errorData = data as WorkflowError;
                  setErrorDetails(errorData);
                  setError(`${errorData.stageName} 失败: ${errorData.message}`);
                  setMode('input');
                  return;
                }

                case 'workflow-complete': {
                  const resultData = data as SprintWorkflowOutput;
                  setResult(resultData);
                  await setSprintPlan(resultData.finalPlan);
                  setMode('results');
                  setActiveTab('results');
                  return;
                }
              }
            } catch (e) {
              console.error('解析 SSE 事件失败:', e);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('生成已取消');
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setError(`生成失败: ${message}`);
      }
      setMode('input');
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMode('input');
  };

  const handleToggleTask = async (taskId: string) => {
    await toggleTask(taskId);
  };

  const handleRegenerate = () => {
    setResult(null);
    setMode('input');
    setActiveTab('input');
  };

  const stageNames = [
    'JD 聚合与提炼',
    '能力差距分析',
    '个性化计划生成',
    '计划优化与确认',
  ];

  const levelLabels: Record<string, string> = {
    beginner: '入门级',
    intermediate: '进阶级',
    advanced: '高级',
  };

  const strategyLabels: Record<string, string> = {
    'critical-first': '优先弥补 Critical 差距',
    balanced: '均衡覆盖',
    'confidence-first': '先做容易提升信心的任务',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 font-medium mb-2">
          <Calendar className="w-4 h-4" />
          模块 03
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">4 周信心冲刺</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          输入目标岗位 JD 和个人经历，自动分析能力差距并生成个性化冲刺计划
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('input')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'input'
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            配置输入
          </span>
        </button>
        <button
          onClick={() => setActiveTab('results')}
          disabled={mode !== 'results' && !sprintPlan}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            activeTab === 'results'
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            冲刺计划
            {result && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                已生成
              </span>
            )}
          </span>
        </button>
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {mode === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
                  <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  正在生成你的个性化冲刺计划
                </h3>
                <p className="text-gray-500">{stageMessage}</p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                {stageNames.map((name, index) => {
                  const stageId = index + 1;
                  const isActive = stageId === generatingStage;
                  const isCompleted = completedStages.includes(stageId);

                  return (
                    <div key={stageId} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCompleted
                            ? 'bg-green-500'
                            : isActive
                            ? 'bg-primary-500 animate-pulse'
                            : 'bg-gray-200 dark:bg-gray-800'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : isActive ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <span className="text-sm font-medium text-gray-500">{stageId}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-sm font-medium ${
                            isCompleted
                              ? 'text-green-600 dark:text-green-400'
                              : isActive
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {name}
                        </div>
                        {isActive && (
                          <div className="mt-1 w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stageProgress * 100}%` }}
                              transition={{ duration: 0.3 }}
                              className="h-full bg-primary-500 rounded-full"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  取消生成
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'input' && mode !== 'generating' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
                      {errorDetails && (
                        <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                          阶段 {errorDetails.stage}: {errorDetails.stageName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    目标岗位 JD
                  </h2>
                  <button
                    onClick={addJD}
                    disabled={jds.length >= 3}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加 JD
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  支持输入 1-3 个目标岗位的 JD，系统会自动聚合共同要求并分析差异
                </p>

                <div className="space-y-4">
                  {jds.map((jd, index) => (
                    <div
                      key={jd.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          JD #{index + 1}
                        </span>
                        {jds.length > 1 && (
                          <button
                            onClick={() => removeJD(jd.id)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="岗位标题（可选，如：字节跳动 - 产品经理）"
                        value={jd.title}
                        onChange={(e) => updateJD(jd.id, 'title', e.target.value)}
                        className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <textarea
                        placeholder="粘贴招聘要求原文..."
                        value={jd.content}
                        onChange={(e) => updateJD(jd.id, 'content', e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                      />
                      <div className="mt-2 text-xs text-gray-400">
                        {jd.content.length}/15000 字符
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-500" />
                    个人经历（可选）
                  </h2>
                  <button
                    onClick={addExperience}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加经历
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  描述你的校园经历、项目经验、实习经历等，系统会分析与岗位要求的匹配度
                </p>

                <div className="space-y-4">
                  {experiences.map((exp, index) => (
                    <div
                      key={exp.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          经历 #{index + 1}
                        </span>
                        {experiences.length > 1 && (
                          <button
                            onClick={() => removeExperience(exp.id)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="经历标题（可选，如：学生会项目管理）"
                        value={exp.title}
                        onChange={(e) => updateExperience(exp.id, 'title', e.target.value)}
                        className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <textarea
                        placeholder="描述这段经历的具体内容..."
                        value={exp.content}
                        onChange={(e) => updateExperience(exp.id, 'content', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-orange-500" />
                    偏好设置
                  </h2>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      showAdvanced ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            每天可用时间
                          </label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="0.5"
                              max="8"
                              step="0.5"
                              value={preferences.dailyHoursAvailable}
                              onChange={(e) =>
                                setPreferences({
                                  ...preferences,
                                  dailyHoursAvailable: parseFloat(e.target.value),
                                })
                              }
                              className="flex-1"
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">
                              {preferences.dailyHoursAvailable} 小时
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            当前水平
                          </label>
                          <div className="flex gap-2">
                            {(['beginner', 'intermediate', 'advanced'] as const).map(
                              (level) => (
                                <button
                                  key={level}
                                  onClick={() => setPreferences({ ...preferences, currentLevel: level })}
                                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    preferences.currentLevel === level
                                      ? 'bg-primary-600 text-white'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  {levelLabels[level]}
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            优先级策略
                          </label>
                          <div className="space-y-2">
                            {(['critical-first', 'balanced', 'confidence-first'] as const).map(
                              (strategy) => (
                                <button
                                  key={strategy}
                                  onClick={() =>
                                    setPreferences({ ...preferences, priorityStrategy: strategy })
                                  }
                                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                                    preferences.priorityStrategy === strategy
                                      ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500 text-primary-700 dark:text-primary-300'
                                      : 'bg-gray-50 dark:bg-gray-900/50 border-2 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                  }`}
                                >
                                  <div className="font-medium">{strategyLabels[strategy]}</div>
                                  <div className="text-xs opacity-75 mt-0.5">
                                    {strategy === 'critical-first' &&
                                      '先补全最关键的能力差距，快速达到岗位基本要求'}
                                    {strategy === 'balanced' &&
                                      '均衡分配学习时间，同时兼顾关键技能和信心构建'}
                                    {strategy === 'confidence-first' &&
                                      '从容易上手的任务开始，逐步建立学习信心，再挑战难度'}
                                  </div>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate()}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/25 text-base"
                >
                  <Play className="w-5 h-5" />
                  生成个性化冲刺计划
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && mode !== 'generating' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {result && result.gapReport && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    能力差距分析报告
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {result.gapReport.overallCoverage}%
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        能力覆盖度
                      </div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                        {result.gapReport.criticalGaps.length}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">
                        关键差距
                      </div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                        {result.gapReport.improvements.length}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        改进建议
                      </div>
                    </div>
                  </div>

                  {result.gapReport.criticalGaps.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        关键差距（需要优先弥补）
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.gapReport.criticalGaps.map((gap, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          >
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {gap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.gapReport.improvements.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        改进建议
                      </div>
                      <ul className="space-y-1">
                        {result.gapReport.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {sprintPlan && sprintPlan.length > 0 && (
                <>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        总体进度
                      </div>
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
                                        <div className="text-xs font-medium text-gray-500 mb-1.5">
                                          学习资源
                                        </div>
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

                  <div className="flex justify-center gap-4 pt-4">
                    <button
                      onClick={handleRegenerate}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      重新生成
                    </button>
                    <button
                      onClick={() => router.push('/mock')}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 text-sm"
                    >
                      下一步：来一次模拟面试
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}

              {!sprintPlan && !result && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    还没有生成冲刺计划
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    请先在「配置输入」标签页中输入目标岗位 JD 和个人经历
                  </p>
                  <button
                    onClick={() => setActiveTab('input')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    去配置输入
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
