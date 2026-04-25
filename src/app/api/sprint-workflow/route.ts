import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  SprintWorkflowInputSchema,
  StageProgressEventSchema,
  type SprintWorkflowInput,
} from '@/lib/schemas';
import {
  executeWorkflow,
  WORKFLOW_STAGES,
  isWorkflowError,
  type WorkflowProgress,
  type StageCompleteResult,
  type WorkflowError,
} from '@/workflow';

export const runtime = 'nodejs';

const InputSchema = z.object({
  rawJDs: z.array(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().min(20).max(15000),
    })
  ).min(1).max(3),
  rawExperiences: z.array(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().min(10).max(5000),
    })
  ).optional(),
  preferences: z.object({
    dailyHoursAvailable: z.number().min(0.5).max(8).default(2),
    currentLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
    priorityStrategy: z
      .enum(['critical-first', 'balanced', 'confidence-first'])
      .default('critical-first'),
  }),
  existingJdResults: z.array(z.any()).optional(),
  existingExperienceResults: z.array(z.any()).optional(),
  regenerateFromStage: z.number().optional(),
  stream: z.boolean().default(true),
});

function formatSSEEvent(event: string, data: string): string {
  const lines = data.split('\n');
  const formatted = lines.map((line) => `data: ${line}`).join('\n');
  return `event: ${event}\n${formatted}\n\n`;
}

function createStreamResponse(
  input: SprintWorkflowInput
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const streamHandler = (
          type: 'progress' | 'stage-complete' | 'error' | 'complete',
          data: any
        ) => {
          try {
            let event: string;
            let eventData: string;

            switch (type) {
              case 'progress':
                event = 'stage-progress';
                const progressData = data as WorkflowProgress;
                eventData = JSON.stringify({
                  stage: progressData.stage,
                  stageName: progressData.stageName,
                  status: progressData.status,
                  progress: progressData.progress,
                  message: progressData.message,
                });
                break;

              case 'stage-complete':
                event = 'stage-complete';
                const stageData = data as StageCompleteResult;
                eventData = JSON.stringify({
                  stage: stageData.stage,
                  stageName: stageData.stageName,
                });
                break;

              case 'error':
                event = 'workflow-error';
                const errorData = data as WorkflowError;
                eventData = JSON.stringify({
                  stage: errorData.stage,
                  stageName: errorData.stageName,
                  message: errorData.message,
                  retryable: errorData.retryable,
                });
                break;

              case 'complete':
                event = 'workflow-complete';
                eventData = JSON.stringify(data);
                break;

              default:
                return;
            }

            const sseMessage = formatSSEEvent(event, eventData);
            controller.enqueue(encoder.encode(sseMessage));
          } catch (e) {
            console.error('Stream handler error:', e);
          }
        };

        const result = await executeWorkflow(input, {
          stream: streamHandler,
        });

        const finalMessage = formatSSEEvent('workflow-complete', JSON.stringify(result));
        controller.enqueue(encoder.encode(finalMessage));
        controller.close();

      } catch (error) {
        let errorMessage = '工作流执行失败';
        let stageId = 1;
        let stageName = '初始化';
        let retryable = true;

        if (isWorkflowError(error)) {
          errorMessage = error.message;
          stageId = error.stage;
          stageName = error.stageName;
          retryable = error.retryable;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        const errorEvent = formatSSEEvent('workflow-error', JSON.stringify({
          stage: stageId,
          stageName,
          message: errorMessage,
          retryable,
        }));
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      }
    },
  });
}

async function handleNonStreaming(
  input: SprintWorkflowInput
): Promise<NextResponse> {
  try {
    const result = await executeWorkflow(input);
    return NextResponse.json(result);
  } catch (error) {
    let errorMessage = '工作流执行失败';
    let statusCode = 500;

    if (isWorkflowError(error)) {
      errorMessage = error.message;
      if (!error.retryable) {
        statusCode = 400;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        retryable: isWorkflowError(error) ? error.retryable : true,
      },
      { status: statusCode }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parseResult = InputSchema.safeParse(body);
    if (!parseResult.success) {
      const message = parseResult.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      return NextResponse.json(
        { error: `输入校验失败: ${message}`, retryable: false },
        { status: 400 }
      );
    }

    const input: SprintWorkflowInput = parseResult.data as any;

    if (parseResult.data.stream) {
      const stream = createStreamResponse(input);

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    } else {
      return handleNonStreaming(input);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('rate limit') || message.includes('429')) {
      return NextResponse.json(
        { error: '模型请求过于频繁，请稍后重试', retryable: true, retryAfter: 60 },
        { status: 429 }
      );
    }

    if (message.includes('API key') || message.includes('Unauthorized') || message.includes('401')) {
      return NextResponse.json(
        { error: '模型服务未配置或密钥无效，请联系管理员', retryable: false },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '工作流执行暂时失败，请稍后重试', retryable: true },
      { status: 500 }
    );
  }
}
