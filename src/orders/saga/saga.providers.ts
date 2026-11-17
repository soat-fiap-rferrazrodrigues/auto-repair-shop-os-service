import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
import {
  LoggingMessagePublisher,
  MessagePublisher,
} from '../../common/messaging/message-publisher';
import { SnsMessagePublisher } from '../../common/messaging/sns-message-publisher';
import { OrderSagaOrchestrator } from './order-saga.orchestrator';
import { SagaEventConsumer } from './saga-event.consumer';

/** SNS publisher when SAGA_SNS_TOPIC_ARN is set, logging fallback otherwise. */
export const messagePublisherProvider: Provider = {
  provide: MessagePublisher,
  inject: [ConfigService],
  useFactory: (config: ConfigService): MessagePublisher => {
    const topicArn = config.get<string>('SAGA_SNS_TOPIC_ARN');
    if (!topicArn) return new LoggingMessagePublisher();
    return new SnsMessagePublisher(
      new SNSClient({
        region: config.get<string>('AWS_REGION'),
        endpoint: config.get<string>('AWS_ENDPOINT_URL'),
      }),
      topicArn,
    );
  },
};

/** Starts the SQS consumer only when SAGA_SQS_QUEUE_URL is set. */
export const sagaConsumerProvider: Provider = {
  provide: SagaEventConsumer,
  inject: [ConfigService, OrderSagaOrchestrator],
  useFactory: (config: ConfigService, orchestrator: OrderSagaOrchestrator) => {
    const queueUrl = config.get<string>('SAGA_SQS_QUEUE_URL');
    if (!queueUrl) return null;
    const consumer = new SagaEventConsumer(
      new SQSClient({
        region: config.get<string>('AWS_REGION'),
        endpoint: config.get<string>('AWS_ENDPOINT_URL'),
      }),
      queueUrl,
      orchestrator,
    );
    consumer.start();
    return consumer;
  },
};
