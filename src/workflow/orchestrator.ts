import type {
  SprintWorkflowInput,
  SprintWorkflowOutput,
  SprintPlan,
  GapReport,
} from '@/lib/schemas';
import type {
  WorkflowContext,
  WorkflowProgress,
  StageCompleteResult,
  WorkflowStreamHandler,
  WorkflowError,
} from './types';
import { WORKFLOW_STAGES, generateWorkflowId, isWorkflowError } from './types';
import { executeStage1, stage1ToSimpleJDOutput } from './stages/stage1-aggregate';
import { executeStage2, calculateSimpleCoverage } from './stages/stage2-analyze';
import { executeStage3, personalizedToSprintPlan } from './stages/stage3-generate';
import {
  executeStage4,
  shouldSkipStage4,
  getQuickOptimization,
} from './stages/stage4-optimize';

export interface OrchestratorOptions {
  stream?: WorkflowStreamHandler;
  skipStage4?: boolean;
}

async function executeStage(
  stageId: number,
  context: WorkflowContext
): Promise<void> {
  const stage = WORKFLOW_STAGES.find((s) => s.id === stageId);
  if (!stage) {
    throw new Error(`未知阶段: ${stageId}`);
  }

  const stream = context.stream;

  // 发送进度开始事件
  const progressStart: WorkflowProgress = {
    stage: stage.id,
    stageName: stage.name,
    status: 'running',
    progress: 0.05,
    message: `开始 ${stage.name}`,
  };

  stream?.('progress', progressStart);

  try {
    let result: any;

    const onStageProgress = (progress: number, message: string) => {
      stream?.('progress', {
        stage: stage.id,
        stageName: stage.name,
        status: 'running',
        progress,
        message,
      });
    };

    const stageId = stage.id;

    switch (stageId) {
      case 1:
        result = await executeStage1(context, onStageProgress);
        context.results.aggregatedProfile = result;
        break;
      case 2:
        result = await executeStage2(context, onStageProgress);
        context.results.gapAnalysis = result;
        break;
      case 3:
        result = await executeStage3(context, onStageProgress);
        context.results.personalizedPlan = result;
        break;
      case 4:
        result = await executeStage4(context, onStageProgress);
        context.results.optimizedPlan = result;
        break;
      default:
        throw new Error(`未实现的阶段: ${stageId}`);
    }

    context.metadata.stagesCompleted++;

    // 发送阶段完成事件
    const completeResult: StageCompleteResult = {
      stage: stage.id,
      stageName: stage.name,
      result,
    };

    stream?.('stage-complete', completeResult);

    // 发送进度完成事件
    stream?.('progress', {
      stage: stage.id,
      stageName: stage.name,
      status: 'completed',
      progress: 1,
      message: `${stage.name} 完成`,
    });
  } catch (error) {
    const workflowError: WorkflowError = {
      stage: stage.id,
      stageName: stage.name,
      originalError: error instanceof Error ? error : new Error(String(error)),
      partialResults: context.results,
      message: `${stage.name} 失败: ${error instanceof Error ? error.message : String(error)}`,
      retryable: true,
    };

    stream?.('error', workflowError);

    throw workflowError;
  }
}

function buildFinalOutput(context: WorkflowContext): SprintWorkflowOutput {
  const endTime = new Date().toISOString();
  const startTime = context.metadata.startTime;
  const totalDurationMs =
    new Date(endTime).getTime() - new Date(startTime).getTime();

  let finalPlan: SprintPlan = [];
  let gapReport: GapReport = {
    overallCoverage: 0,
    criticalGaps: [],
    improvements: [],
  };

  // 构建简化版计划（兼容旧版）
  if (context.results.personalizedPlan) {
    finalPlan = personalizedToSprintPlan(context.results.personalizedPlan);
  } else if (context.results.aggregatedProfile) {
    // 如果没有个性化计划，使用聚合后的 JD 生成简化版
    const simpleJD = stage1ToSimpleJDOutput(context.results.aggregatedProfile);
    finalPlan = [
      {
        week: 1,
        theme: '基础能力补齐',
        tasks: simpleJD.weekly_proof.map((p, i) => ({
          id: `week1-task${i + 1}`,
          title: p.task,
          description: `根据岗位要求，${p.task}`,
          resources: [],
          deliverable_type: p.proof_type,
          completed: false,
        })),
      },
      {
        week: 2,
        theme: '技能深化',
        tasks: [
          {
            id: 'week2-task1',
            title: '项目实战练习',
            description: '找一个真实项目进行练手',
            resources: [],
            deliverable_type: '截图',
            completed: false,
          },
        ],
      },
      {
        week: 3,
        theme: '综合提升',
        tasks: [
          {
            id: 'week3-task1',
            title: '简历优化',
            description: '基于技能分析优化简历',
            resources: [],
            deliverable_type: '文档',
            completed: false,
          },
        ],
      },
      {
        week: 4,
        theme: '模拟面试',
        tasks: [
          {
            id: 'week4-task1',
            title: '模拟面试准备',
            description: '进行至少 2 次模拟面试',
            resources: [],
            deliverable_type: '文档',
            completed: false,
          },
        ],
      },
    ];
  }

  // 构建差距报告
  if (context.results.gapAnalysis) {
    gapReport = calculateSimpleCoverage(context.results.gapAnalysis);
  } else if (context.results.aggregatedProfile) {
    // 如果没有差距分析，使用聚合后的 JD 生成简化版报告
    gapReport = {
      overallCoverage: 50,
      criticalGaps: context.results.aggregatedProfile.priorityMatrix
        .filter((p) => p.priority === 'Critical')
        .map((p) => p.skill),
      improvements: [
        '建议重点掌握 Critical 优先级技能',
        '结合岗位要求针对性学习',
      ],
    };
  }

  return {
    aggregatedProfile: context.results.aggregatedProfile,
    gapAnalysis: context.results.gapAnalysis,
    personalizedPlan: context.results.personalizedPlan,
    optimizedPlan: context.results.optimizedPlan,
    finalPlan,
    gapReport,
    metadata: {
      workflowId: context.metadata.workflowId,
      startTime,
      endTime,
      totalDurationMs,
      stagesCompleted: context.metadata.stagesCompleted,
      totalStages: context.metadata.totalStages,
      llmCalls: context.metadata.llmCalls,
      version: '1.0.0',
    },
  };
}

export async function executeWorkflow(
  input: SprintWorkflowInput,
  options?: OrchestratorOptions
): Promise<SprintWorkflowOutput> {
  const context: WorkflowContext = {
    input,
    results: {},
    metadata: {
      workflowId: generateWorkflowId(),
      startTime: new Date().toISOString(),
      stagesCompleted: 0,
      totalStages: WORKFLOW_STAGES.length,
      llmCalls: 0,
    },
    stream: options?.stream,
  };

  const startFromStage = input.regenerateFromStage ?? 1;

  try {
    // 执行各阶段
    for (const stage of WORKFLOW_STAGES) {
      // 如果是从某个阶段重新生成，跳过之前的阶段
      if (input.regenerateFromStage && stage.id < input.regenerateFromStage) {
        // 保留已有的结果
        continue;
      }

      // 检查是否可以跳过阶段 4
      if (stage.id === 4) {
        if (options?.skipStage4 || shouldSkipStage4(context)) {
          // 跳过优化，使用快速优化
          if (context.results.personalizedPlan) {
            context.results.optimizedPlan = getQuickOptimization(
              context.results.personalizedPlan
            );
            context.metadata.stagesCompleted++;
          }
          continue;
        }
      }

      await executeStage(stage.id, context);
    }

    // 构建最终输出
    const output = buildFinalOutput(context);

    // 发送完成事件
    context.stream?.('complete', output);

    return output;
  } catch (error) {
    if (isWorkflowError(error)) {
      throw error;
    }

    throw {
      stage: startFromStage,
      stageName: '工作流执行',
      originalError: error instanceof Error ? error : new Error(String(error)),
      partialResults: context.results,
      message: `工作流执行失败: ${error instanceof Error ? error.message : String(error)}`,
      retryable: true,
    } as WorkflowError;
  }
}

export { WORKFLOW_STAGES, generateWorkflowId, isWorkflowError };
