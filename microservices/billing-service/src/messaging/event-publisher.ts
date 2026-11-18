import { Injectable, Logger } from '@nestjs/common';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

export type BillingEvent =
  | { type: 'BudgetGenerated'; orderId: string; total: number }
  | { type: 'BudgetFailed'; orderId: string; reason: string }
  | { type: 'PaymentConfirmed'; orderId: string; paymentId: string }
  | { type: 'PaymentFailed'; orderId: string; reason: string };

export abstract class EventPublisher {
  abstract publish(event: BillingEvent): Promise<void>;
}

@Injectable()
export class LoggingEventPublisher extends EventPublisher {
  private readonly logger = new Logger('EventPublisher');

  publish(event: BillingEvent): Promise<void> {
    this.logger.log(`event=${event.type} correlation_id=${event.orderId}`);
    return Promise.resolve();
  }
}

/** Publishes to the billing SNS topic; `type` is also a message attribute for filter policies. */
export class SnsEventPublisher extends EventPublisher {
  private readonly logger = new Logger(SnsEventPublisher.name);

  constructor(
    private readonly client: SNSClient,
    private readonly topicArn: string,
  ) {
    super();
  }

  async publish(event: BillingEvent): Promise<void> {
    await this.client.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(event),
        MessageAttributes: {
          type: { DataType: 'String', StringValue: event.type },
          correlation_id: { DataType: 'String', StringValue: event.orderId },
        },
      }),
    );
    this.logger.log(
      `published event=${event.type} correlation_id=${event.orderId}`,
    );
  }
}
