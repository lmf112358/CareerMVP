import Link from 'next/link';
import { ArrowRight, Search, Briefcase, Calendar, MessageSquare, Shield, Zap, Lock } from 'lucide-react';

const features = [
  {
    icon: Search,
    title: 'JD 透视镜',
    description: '输入原始招聘要求，自动解构为核心动作、技能要求、隐藏风险和 4 周准备计划。',
    href: '/jd-parser',
  },
  {
    icon: Briefcase,
    title: '经历显影器',
    description: '把你的校园/项目经历用 STAR 法则重构，自动生成简历话术和可迁移能力标签。',
    href: '/experience',
  },
  {
    icon: Calendar,
    title: '4 周信心冲刺',
    description: '基于能力缺口生成可执行的微任务计划，每一步都有明确的交付物和进度追踪。',
    href: '/sprint',
  },
  {
    icon: MessageSquare,
    title: '实战模拟舱',
    description: '多角色模拟面试（HR / 业务面 / 压力面），结束后自动生成结构化评分和改进建议。',
    href: '/mock',
  },
];

const values = [
  {
    icon: Shield,
    title: '隐私优先',
    description: '所有进度与草稿仅存于本地 IndexedDB，不上传服务器。',
  },
  {
    icon: Zap,
    title: '即时反馈',
    description: '流式 AI 响应，即时进度动效，让每一步进展都可视化。',
  },
  {
    icon: Lock,
    title: '零焦虑设计',
    description: '不做同行对比，只看个人进度条，让求职回归自我成长。',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-full">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-white dark:from-gray-900 dark:to-gray-950" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              你的求职信心构建引擎
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
              把求职焦虑
              <span className="text-primary-600 dark:text-primary-400"> 变成可量化的能力证据</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              从 JD 解构到经历翻译，从微行动冲刺到实战验证 —— CareerMVP 陪你走完求职的每一步，
              让你在面试前就知道「我已经准备好了」。
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/jd-parser"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
              >
                开始拆解目标 JD
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/mock"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                先试一次模拟面试
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              四步闭环，构建你的求职证据链
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              不再靠「感觉」求职，每一步都有可验证的交付物
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                          0{index + 1}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                      <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400">
                        开始使用 <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              设计理念：让求职回归「人」本身
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center"
                >
                  <div className="inline-flex w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{value.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
