import { withCorrelation } from '../../common/logger/correlation-context';
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { OrderSagaOrchestrator } from './order-saga.orchestrator';
import { SagaEvent } from './saga-events';

const EVENT_TYPES = new Set<SagaEvent['type']>([
  'BudgetGenerated',
  'BudgetFailed',
  'BudgetApproved',
  'BudgetRejected',
  'PaymentConfirmed',
  'PaymentFailed',
  'ExecutionQueued',
  'StockUnavailable',
  'ExecutionFinished',
]);

/**
 * Long-polls the saga SQS queue and feeds events to the orchestrator.
 * Failed messages are not deleted: SQS redelivers them and, after
 * maxReceiveCount, moves them to the DLQ.
 */
export class SagaEventConsumer implements OnApplicationShutdown {
  private readonly logger = new Logger(SagaEventConsumer.name);
  private running = false;

  constructor(
    private readonly client: SQSClient,
    private readonly queueUrl: string,
    private readonly orchestrator: OrderSagaOrchestrator,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.loop();
  }

  onApplicationShutdown(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        await this.poll();
      } catch (err) {
        this.logger.error(`poll failed: ${(err as Error).message}`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  async poll(): Promise<void> {
    const { Messages = [] } = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ['All'],
      }),
    );
    for (const msg of Messages) await this.process(msg);
  }

  async process(msg: Message): Promise<void> {
    let event: SagaEvent;
    try {
      event = SagaEventConsumer.parse(msg.Body ?? '');
    } catch (err) {
      // Poison message: leave it for the DLQ.
      this.logger.error(`invalid message ${msg.MessageId}: ${String(err)}`);
      return;
    }
    await withCorrelation(event.orderId, () => this.handle(msg, event));
  }

  private async handle(msg: Message, event: SagaEvent): Promise<void> {
    try {
      await this.orchestrator.handle(event);
      await this.client.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: msg.ReceiptHandle,
        }),
      );
    } catch (err) {
      this.logger.error(
        `handle failed type=${event.type} correlation_id=${event.orderId}: ${(err as Error).message}`,
      );
    }
  }

  /** Accepts both raw delivery and the SNS notification envelope. */
  static parse(body: string): SagaEvent {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    let data = parsed;
    let type = parsed.type;
    if (parsed.Type === 'Notification' && typeof parsed.Message === 'string') {
      data = JSON.parse(parsed.Message) as Record<string, unknown>;
      const attrs = parsed.MessageAttributes as
        | Record<string, { Value: string }>
        | undefined;
      type = data.type ?? attrs?.type?.Value;
    }
    if (typeof type !== 'string' || !EVENT_TYPES.has(type as never))
      throw new Error(`unknown event type: ${String(type)}`);
    if (typeof data.orderId !== 'string') throw new Error('missing orderId');
    return { ...data, type } as SagaEvent;
  }
}
