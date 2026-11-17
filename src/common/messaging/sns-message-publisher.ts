import { Injectable, Logger } from '@nestjs/common';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { MessagePublisher, OutgoingMessage } from './message-publisher';

/**
 * Publishes commands to a single SNS topic. The logical topic travels as the
 * `type` message attribute so each SQS subscription can filter by it.
 */
@Injectable()
export class SnsMessagePublisher extends MessagePublisher {
  private readonly logger = new Logger(SnsMessagePublisher.name);

  constructor(
    private readonly client: SNSClient,
    private readonly topicArn: string,
  ) {
    super();
  }

  async publish(message: OutgoingMessage): Promise<void> {
    await this.client.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(message.payload),
        MessageAttributes: {
          type: { DataType: 'String', StringValue: message.topic },
          correlation_id: {
            DataType: 'String',
            StringValue: message.correlationId,
          },
        },
      }),
    );
    this.logger.log(
      `published type=${message.topic} correlation_id=${message.correlationId}`,
    );
  }
}
