# 📘 CareerMVP 职向标 | 完整技术方案文档

> **版本**：v1.0.0  
> **状态**：技术评审阶段（待确认 5 项关键决策）  
> **定位**：面向求职期大学生的“信心构建引擎”，通过 `JD解构 → 经历翻译 → 微行动冲刺 → 实战验证` 闭环，将焦虑转化为可量化的能力证据。

---

## 一、 系统架构设计

采用 **边缘优先 + 客户端持久化** 的轻量架构，保障隐私、降低运维成本、适配 TRAE SOLO 快速迭代。

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                    │
│  Next.js 14 (App Router) │ Tailwind │ Zustand │ idb-keyval│
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ JD透视镜│ │经历显影器│ │4周冲刺计划│ │ 实战模拟舱   │ │
│  └─────────┘ └──────────┘ └──────────┘ └──────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / SSE / Streaming
┌──────────────────────────▼──────────────────────────────┐
│                  API Routes (Serverless)                │
│  /api/jd-parse  /api/experience-map  /api/sprint-plan   │
│  /api/mock-chat /api/feedback        (Zod校验中间件)     │
└──────────────────────────┬──────────────────────────────┘
                           │ AI SDK Unified Interface
┌──────────────────────────▼──────────────────────────────┐
│                LLM Provider (OpenAI兼容)                 │
│  DeepSeek / SiliconFlow / OpenAI / 本地 Ollama (可切换)  │
└─────────────────────────────────────────────────────────┘
```

**架构原则**：
- 🛡️ **隐私优先**：不上传学生敏感信息，进度与草稿仅存于本地 `IndexedDB`。
- ⚡ **边缘计算**：API 路由部署于 Vercel Edge，冷启动 < 100ms。
- 🔌 **可插拔 AI**：通过 `@ai-sdk` 统一抽象，切换模型只需改 `.env`。

---

## 二、 技术栈选型与依据

| 层级          | 技术                               | 选型理由                                                   |
| :------------ | :--------------------------------- | :--------------------------------------------------------- |
| **框架**      | Next.js 14 (App Router)            | SSR/CSR 混合，路由清晰，内置 API Routes，SEO 友好          |
| **UI/样式**   | TailwindCSS + shadcn/ui            | 原子化样式快速开发，组件可复用，暗色模式原生支持           |
| **AI 交互**   | `@ai-sdk/react` + `@ai-sdk/openai` | 官方流式钩子 `useChat`，内置工具调用、记忆管理、多模型路由 |
| **数据校验**  | `Zod`                              | 强类型 Schema 约束 LLM 输出，防止前端解析崩溃              |
| **状态/存储** | `Zustand` + `idb-keyval`           | 轻量状态管理 + 浏览器 IndexedDB，支持离线持久与大容量      |
| **动效/交互** | `Framer Motion` + `Lucide React`   | 进度条、完成弹窗、卡片展开，强化“信心可视化”反馈           |
| **部署**      | Vercel                             | 零配置 CI/CD，自动 Edge 分发，免费额度充足                 |

---

## 三、 核心模块设计与数据流

### 1. 📄 JD透视镜 (`/api/jd-parse`)
- **输入**：原始 JD 文本
- **处理**：
  ```ts
  // lib/schemas.ts
  export const JDOutputSchema = z.object({
    core_actions: z.array(z.string().max(50)),
    mvs_skills: z.object({ hard: z.array(z.string()), soft: z.array(z.string()) }),
    hidden_risks: z.array(z.string()),
    weekly_proof: z.array(z.object({ week: z.number(), task: z.string(), proof_type: z.enum(["截图","链接","文档","代码"]) }))
  });
  ```
- **输出**：结构化卡片 + 可一键导出为 Markdown/日历

### 2. 🔄 经历显影器 (`/api/experience-map`)
- **输入**：用户填写的 3 段校园/项目经历（自由文本）
- **处理**：Prompt 强制要求 `STAR` 结构 + 业务语言转换 + 数据占位符提示
- **输出**：`可迁移能力标签` → `优化前后对比` → `1句简历核心话术`（支持 `Ctrl+C` 复制）

### 3. 🗓️ 4周信心冲刺 (`/api/sprint-plan`)
- **触发条件**：完成 JD 解析 + 经历映射后，自动计算能力缺口
- **逻辑**：生成 `4周 × 3个微任务`，每个任务包含：
  - 📖 学习资源（官方文档/免费视频）
  - 🛠️ 交付物类型（如：“用 Excel 做一次数据透视表并截图”）
  - ✅ 勾选校验点（本地状态同步，触发 `framer-motion` 进度条）

### 4. 🎙️ 实战模拟舱 (`/api/mock-chat` + `/api/feedback`)
- **会话管理**：自定义 `useMemoryCompressor`，每 5 轮压缩历史，将岗位设定置顶
- **流式交互**：`useChat` 驱动，支持暂停/重发/多角色切换（HR/业务面/压力面）
- **结束后**：自动调用 `/api/feedback`，输出：
  ```json
  {
    "score": 78,
    "strengths": ["逻辑清晰", "数据意识强"],
    "weaknesses": ["结果未量化", "缺乏复盘视角"],
    "optimized_star": "情境:... 任务:... 行动:... 结果:..."
  }
  ```

---

## 四、 关键技术实现方案

### 🔑 1. LLM 输出强校验与防崩溃机制
```ts
// app/api/jd-parse/route.ts
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { JDOutputSchema } from '@/lib/schemas';

export async function POST(req: Request) {
  const { text } = await req.json();
  const result = await generateObject({
    model: openai('gpt-4o-mini'), // 或 DeepSeek-V3
    schema: JDOutputSchema,
    prompt: `你是一个资深业务负责人。请将以下JD翻译为严格符合 JSON Schema 的结构：\n${text}`,
    temperature: 0.2,
  });
  return Response.json(result.object);
}
```
✅ **优势**：类型安全、前端直接消费、失败自动降级提示。

### 🔑 2. 上下文压缩与记忆管理
```ts
// hooks/useMemoryCompressor.ts
export function compressHistory(messages: CoreMessage[], maxTokens = 3000) {
  // 保留系统提示 + 最近3轮对话，其余摘要化
  // 返回新消息数组，供 useChat 注入
}
```

### 🔑 3. 进度持久化与离线同步
```ts
// store/useProgressStore.ts
import { create } from 'zustand';
import { get, set } from 'idb-keyval';

export const useProgress = create((set) => ({
  progress: {},
  load: async () => set({ progress: await get('career_progress') || {} }),
  update: async (key, value) => {
    const next = { ...useProgress.getState().progress, [key]: value };
    await set('career_progress', next);
    set({ progress: next });
  }
}));
```

---

## 五、 开发里程碑（TRAE SOLO 工作流）

| 阶段        | 周期    | SOLO 操作指令示例                                            | 交付物                    |
| :---------- | :------ | :----------------------------------------------------------- | :------------------------ |
| **Phase 1** | D1-D2   | `初始化 Next.js 14 App Router 项目，配置 Tailwind、shadcn/ui、路由骨架` | 可运行空壳 + 导航布局     |
| **Phase 2** | D3-D5   | `生成 /api/jd-parse 与 /api/experience-map，集成 Zod 校验与 AI SDK` | 两个核心 API + 表单 UI    |
| **Phase 3** | D6-D8   | `开发状态管理、IndexedDB 同步、4周计划卡片组件与进度动效`    | 可勾选计划页 + 本地持久化 |
| **Phase 4** | D9-D11  | `实现模拟舱流式对话、上下文压缩、面试后结构化反馈生成`       | 聊天界面 + 评分面板       |
| **Phase 5** | D12-D14 | `联调测试、错误边界、PWA 支持、Vercel 部署配置`              | 生产可用版本 + 演示链接   |

---

## 六、 安全、合规与伦理边界
- 🔒 **零敏感数据存储**：所有草稿、进度、面试记录仅存本地，提供 `一键清除数据` 按钮。
- ⚠️ **AI 免责声明**：界面显著位置标注 `“AI 生成内容仅供参考，请结合实际情况调整，严禁虚构经历”`。
- 📉 **反焦虑设计**：不展示“同行对比/薪资排行/排名”，仅聚焦“个人进度条”。

---

