import { Injectable, Logger } from '@nestjs/common';

export interface OutgoingMessage {
  topic: string;
  payload: Record<string, unknown>;
  correlationId: string;
}

/**
 * Port for asynchronous messaging. Production binds an SNS/SQS adapter;
 * the default implementation only logs, keeping the monolith runnable.
 */
export abstract class MessagePublisher {
  abstract publish(message: OutgoingMessage): Promise<void>;
}

@Injectable()
export class LoggingMessagePublisher extends MessagePublisher {
  private readonly logger = new Logger('MessagePublisher');

  publish(message: OutgoingMessage): Promise<void> {
    this.logger.log(
      `publish topic=${message.topic} correlation_id=${message.correlationId}`,
    );
    return Promise.resolve();
  }
}
