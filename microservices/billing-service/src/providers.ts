import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
import {
  EventPublisher,
  LoggingEventPublisher,
  SnsEventPublisher,
} from './messaging/event-publisher';
import { CommandConsumer } from './messaging/command.consumer';
import { MercadoPagoClient } from './mercadopago/mercadopago.client';
import { BillingService } from './billing/billing.service';

const aws = (config: ConfigService) => ({
  region: config.get<string>('AWS_REGION'),
  endpoint: config.get<string>('AWS_ENDPOINT_URL') || undefined,
});

export const eventPublisherProvider: Provider = {
  provide: EventPublisher,
  inject: [ConfigService],
  useFactory: (config: ConfigService): EventPublisher => {
    const topicArn = config.get<string>('BILLING_SNS_TOPIC_ARN');
    return topicArn
      ? new SnsEventPublisher(new SNSClient(aws(config)), topicArn)
      : new LoggingEventPublisher();
  },
};

export const commandConsumerProvider: Provider = {
  provide: CommandConsumer,
  inject: [ConfigService, BillingService],
  useFactory: (config: ConfigService, billing: BillingService) => {
    const queueUrl = config.get<string>('BILLING_SQS_QUEUE_URL');
    if (!queueUrl) return null;
    const consumer = new CommandConsumer(
      new SQSClient(aws(config)),
      queueUrl,
      billing,
    );
    consumer.start();
    return consumer;
  },
};

export const mercadoPagoProvider: Provider = {
  provide: MercadoPagoClient,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new MercadoPagoClient({
      accessToken: config.getOrThrow<string>('MP_ACCESS_TOKEN'),
      apiUrl: config.get<string>('MP_API_URL') ?? 'https://api.mercadopago.com',
      notificationUrl: config.get<string>('MP_NOTIFICATION_URL'),
      webhookSecret: config.get<string>('MP_WEBHOOK_SECRET'),
    }),
};
