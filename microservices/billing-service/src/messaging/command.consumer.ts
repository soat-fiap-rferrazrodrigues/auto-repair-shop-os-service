import { withCorrelation } from '../logging/json.logger';
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import {
  BillingService,
  GenerateBudgetCommand,
} from '../billing/billing.service';

export type BillingCommand =
  | ({ type: 'billing.GenerateBudget' } & GenerateBudgetCommand)
  | { type: 'billing.CreatePayment'; orderId: string }
  | { type: 'billing.RefundPayment'; orderId: string; paymentId?: string };

const COMMANDS = new Set([
  'billing.GenerateBudget',
  'billing.CreatePayment',
  'billing.RefundPayment',
]);

/**
 * Long-polls the billing command queue (subscribed to the os-service SNS
 * topic with a filter policy on `type` prefix "billing."). Messages are only
 * deleted after success; failures go back to the queue and then to the DLQ.
 */
export class CommandConsumer implements OnApplicationShutdown {
  private readonly logger = new Logger(CommandConsumer.name);
  private running = false;

  constructor(
    private readonly client: SQSClient,
    private readonly queueUrl: string,
    private readonly billing: BillingService,
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
    let cmd: BillingCommand;
    try {
      cmd = CommandConsumer.parse(msg);
    } catch (err) {
      this.logger.error(`invalid message ${msg.MessageId}: ${String(err)}`);
      return;
    }
    await withCorrelation(cmd.orderId, () => this.handle(msg, cmd));
  }

  private async handle(msg: Message, cmd: BillingCommand): Promise<void> {
    try {
      await this.dispatch(cmd);
      await this.client.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: msg.ReceiptHandle,
        }),
      );
    } catch (err) {
      this.logger.error(
        `handle failed type=${cmd.type} correlation_id=${cmd.orderId}: ${(err as Error).message}`,
      );
    }
  }

  private async dispatch(cmd: BillingCommand): Promise<void> {
    switch (cmd.type) {
      case 'billing.GenerateBudget':
        return this.billing.generateBudget(cmd);
      case 'billing.CreatePayment':
        await this.billing.createPayment(cmd.orderId);
        return;
      case 'billing.RefundPayment':
        return this.billing.refundPayment(cmd.orderId);
    }
  }

  /**
   * Accepts the SNS envelope (type in MessageAttributes of the notification)
   * and raw delivery (type in SQS message attributes or in the body).
   */
  static parse(msg: Message): BillingCommand {
    const body = JSON.parse(msg.Body ?? '') as Record<string, unknown>;
    let data = body;
    let type: unknown = body.type ?? msg.MessageAttributes?.type?.StringValue;
    if (body.Type === 'Notification' && typeof body.Message === 'string') {
      data = JSON.parse(body.Message) as Record<string, unknown>;
      const attrs = body.MessageAttributes as
        Record<string, { Value: string }> | undefined;
      type = data.type ?? attrs?.type?.Value;
    }
    if (typeof type !== 'string' || !COMMANDS.has(type))
      throw new Error(`unknown command: ${String(type)}`);
    if (typeof data.orderId !== 'string') throw new Error('missing orderId');
    return { ...data, type } as BillingCommand;
  }
}
