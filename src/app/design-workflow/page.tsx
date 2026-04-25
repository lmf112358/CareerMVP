'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ArrowRight,
  Search,
  FileText,
  BarChart3,
  Target,
  Lightbulb,
  ClipboardCheck,
  Layers,
  Merge,
  Zap,
  Brain,
  BookOpen,
} from 'lucide-react';

const phases = [
  {
    id: 1,
    title: '阶段 1：多 JD 聚合与提炼',
    subtitle: 'JD Aggregation & Refinement',
    icon: Merge,
    color: 'from-blue-500 to-cyan-500',
    description:
      '支持用户输入多个目标岗位的 JD，自动提炼共同要求和差异点，构建统一的能力画像。',
    features: [
      '支持 1-5 个 JD 同时输入',
      '自动提取共同硬技能/软技能',
      '识别差异点和优先级',
      '生成统一的岗位能力要求向量',
      '输出：AggregatedJDProfile',
    ],
    inputs: [
      { label: 'JD 1: 产品经理（字节）', type: 'text' },
      { label: 'JD 2: 产品经理（腾讯）', type: 'text' },
      { label: 'JD 3: 产品经理（阿里）', type: 'text' },
    ],
    outputs: ['共同要求: PRD 撰写、数据分析、用户调研', '差异要求: 字节强调数据驱动、腾讯强调生态协同'],
  },
  {
    id: 2,
    title: '阶段 2：能力差距分析',
    subtitle: 'Capability Gap Analysis',
    icon: BarChart3,
    color: 'from-purple-500 to-pink-500',
    description:
      '将用户的多段经历与聚合后的岗位要求进行匹配，量化能力覆盖度，识别关键差距。',
    features: [
      '支持 1-10 段经历输入',
      '技能匹配度计算 (0-100%)',
      '差距优先级排序 (Critical/High/Medium/Low)',
      '能力覆盖度可视化',
      '输出：GapAnalysisResult',
    ],
    inputs: [
      { label: '经历 1: 学生会项目管理', type: 'experience' },
      { label: '经历 2: 数据分析竞赛', type: 'experience' },
      { label: '经历 3: 产品实习', type: 'experience' },
    ],
    outputs: [
      '覆盖度: 65%',
      '关键差距: B端产品经验、SQL 进阶、项目管理工具',
      '优先级: Critical (2项), High (3项)',
    ],
  },
  {
    id: 3,
    title: '阶段 3：个性化计划生成',
    subtitle: 'Personalized Plan Generation',
    icon: Target,
    color: 'from-orange-500 to-red-500',
    description:
      '基于差距分析结果，结合用户当前能力水平和可用时间，生成量身定制的 4 周冲刺计划。',
    features: [
      '差距优先级驱动任务排序',
      '用户时间投入偏好 (每天 1-3 小时)',
      '能力水平自适应 (入门/进阶)',
      '学习资源智能推荐',
      '输出：PersonalizedSprintPlan',
    ],
    inputs: [
      { label: '每天可用时间: 2小时', type: 'preference' },
      { label: '当前水平: 入门', type: 'level' },
      { label: '优先级策略: 先补 Critical 差距', type: 'strategy' },
    ],
    outputs: [
      'Week 1: 基础能力补齐 (SQL, PRD)',
      'Week 2: 项目实战 (真实项目练手)',
      'Week 3: 深度提升 (数据分析, 用户研究)',
      'Week 4: 模拟面试与复盘',
    ],
  },
  {
    id: 4,
    title: '阶段 4：计划优化与确认',
    subtitle: 'Plan Optimization & Validation',
    icon: ClipboardCheck,
    color: 'from-green-500 to-emerald-500',
    description:
      '智能评估计划可行性，允许用户调整参数，生成最终可执行的冲刺计划。',
    features: [
      '任务负载合理性检查',
      '依赖关系分析',
      '用户可调整参数',
      '多版本对比 (可选)',
      '输出：FinalSprintPlan + GapReport',
    ],
    inputs: [
      { label: '调整: 增加 SQL 学习时间', type: 'adjustment' },
      { label: '确认: 接受当前计划', type: 'confirmation' },
    ],
    outputs: [
      '最终计划: 4 周 × 2-3 任务/周',
      '差距报告: 可视化覆盖度变化',
      '优化建议: 3 项可改进点',
    ],
  },
];

const dataModelExpansion = [
  {
    name: 'AggregatedJDProfile',
    description: '聚合后的岗位能力画像',
    fields: [
      'id: string',
      'source_jds: number (输入的 JD 数量)',
      'common_skills: { hard: string[], soft: string[] }',
      'differentiated_skills: { company: string, skills: string[] }[]',
      'priority_matrix: { skill: string, priority: "Critical" | "High" | "Medium" }[]',
      'core_actions_union: string[]',
      'hidden_risks_combined: string[]',
    ],
  },
  {
    name: 'GapAnalysisResult',
    description: '能力差距分析结果',
    fields: [
      'overall_coverage: number (0-100)',
      'skill_gaps: { skill: string, required: boolean, covered: boolean, match_score: number, priority: string }[]',
      'experience_matches: { experience_id: string, skills_covered: string[], contribution_score: number }[]',
      'missing_skills_critical: string[]',
      'missing_skills_high: string[]',
      'recommendation_summary: string',
    ],
  },
  {
    name: 'PersonalizedSprintPlan',
    description: '个性化冲刺计划',
    fields: [
      'user_context: { daily_hours_available: number, current_level: "beginner" | "intermediate" | "advanced" }',
      'weeks: { week: number, theme: string, focus_skills: string[], tasks: SprintTask[] }[]',
      'gap_coverage_plan: { skill: string, week_to_cover: number, task_ids: string[] }[]',
      'learning_path_recommendations: { resource: string, type: string, priority: string }[]',
    ],
  },
];

export default function DesignWorkflowPage() {
  const [activePhase, setActivePhase] = useState(1);
  const [showDataModel, setShowDataModel] = useState(false);

  const currentPhase = phases.find((p) => p.id === activePhase)!;
  const Icon = currentPhase.icon;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400 font-medium">设计文档</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            冲刺计划生成工作流
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            多 JD 聚合 → 能力差距分析 → 个性化计划生成 → 计划优化确认
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              架构概览
            </h2>
            <button
              onClick={() => setShowDataModel(!showDataModel)}
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              {showDataModel ? '隐藏数据模型' : '查看数据模型'}
              <ChevronRight className={`w-4 h-4 transition-transform ${showDataModel ? 'rotate-90' : ''}`} />
            </button>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 overflow-hidden">
            {!showDataModel ? (
              <div className="relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-green-500/50" />

                <div className="space-y-8">
                  {phases.map((phase, index) => {
                    const PhaseIcon = phase.icon;
                    return (
                      <motion.div
                        key={phase.id}
                        initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                        className={`relative flex items-center gap-6 ${
                          index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                        }`}
                      >
                        <div className={`flex-1 ${index % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}>
                          <div className="inline-flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-gray-500">0{phase.id}</span>
                            <h3 className="text-lg font-semibold text-white">{phase.title}</h3>
                          </div>
                          <p className="text-sm text-gray-400">{phase.description}</p>
                        </div>

                        <div
                          className={`relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br ${phase.color} flex items-center justify-center shadow-lg`}
                        >
                          <PhaseIcon className="w-7 h-7 text-white" />
                        </div>

                        <div className="flex-1 hidden sm:block" />
                      </motion.div>
                    );
                  })}
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="flex flex-col items-center gap-2">
                    {phases.slice(0, -1).map((_, i) => (
                      <ArrowRight key={i} className="w-5 h-5 text-gray-600" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  数据模型扩展
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {dataModelExpansion.map((model, index) => (
                    <motion.div
                      key={model.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="text-sm font-mono text-cyan-400 mb-1">{model.name}</div>
                      <div className="text-xs text-gray-400 mb-3">{model.description}</div>
                      <div className="space-y-1">
                        {model.fields.slice(0, 5).map((field, i) => (
                          <div key={i} className="text-xs font-mono text-gray-300 truncate">
                            {field}
                          </div>
                        ))}
                        {model.fields.length > 5 && (
                          <div className="text-xs text-gray-500">+{model.fields.length - 5} 更多字段...</div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              阶段详情
            </h2>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {phases.map((phase) => {
              const PhaseIcon = phase.icon;
              return (
                <button
                  key={phase.id}
                  onClick={() => setActivePhase(phase.id)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    activePhase === phase.id
                      ? 'bg-white text-gray-900 shadow-lg shadow-white/10'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  <PhaseIcon className="w-4 h-4" />
                  阶段 {phase.id}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activePhase}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
            >
              <div className={`h-2 bg-gradient-to-r ${currentPhase.color}`} />

              <div className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentPhase.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-1">
                      Phase {currentPhase.id} · {currentPhase.subtitle}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{currentPhase.title}</h3>
                    <p className="text-gray-400">{currentPhase.description}</p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      核心能力
                    </h4>
                    <div className="space-y-2">
                      {currentPhase.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        输入示例
                      </h4>
                      <div className="space-y-2">
                        {currentPhase.inputs.map((input, i) => (
                          <div
                            key={i}
                            className="text-xs font-mono bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-gray-400"
                          >
                            {input.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-400" />
                        输出示例
                      </h4>
                      <div className="space-y-2">
                        {currentPhase.outputs.map((output, i) => (
                          <div
                            key={i}
                            className="text-xs font-mono bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 rounded-lg px-3 py-2 text-green-300"
                          >
                            {output}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-8 py-4 border-t border-white/5 bg-black/20">
                <button
                  onClick={() => setActivePhase((p) => Math.max(1, p - 1))}
                  disabled={activePhase === 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一阶段
                </button>
                <div className="flex items-center gap-1">
                  {phases.map((phase) => (
                    <div
                      key={phase.id}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        phase.id === activePhase ? 'bg-white' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setActivePhase((p) => Math.min(phases.length, p + 1))}
                  disabled={activePhase === phases.length}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  下一阶段
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12"
        >
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10 p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">下一步：实现计划</h3>
                <p className="text-gray-400 mb-4">
                  基于以上 4 阶段工作流设计，我将：
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    '1. 扩展 Zod schemas，新增 AggregatedJDProfile, GapAnalysisResult 等',
                    '2. 实现多 JD 聚合与提炼模块 (phase-1)',
                    '3. 实现能力差距分析与经历匹配模块 (phase-2)',
                    '4. 实现个性化计划生成与优化模块 (phase-3+4)',
                    '5. 重构 API 路由为工作流编排器',
                    '6. 更新前端页面，支持多 JD 输入和进度可视化',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
