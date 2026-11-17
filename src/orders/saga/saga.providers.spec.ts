import { ConfigService } from '@nestjs/config';
import { PublishCommand } from '@aws-sdk/client-sns';
import {
  messagePublisherProvider,
  sagaConsumerProvider,
} from './saga.providers';
import { LoggingMessagePublisher } from '../../common/messaging/message-publisher';
import { SnsMessagePublisher } from '../../common/messaging/sns-message-publisher';
import { SagaEventConsumer } from './saga-event.consumer';

type Factory = (...args: unknown[]) => unknown;
const factory = (p: unknown) => (p as { useFactory: Factory }).useFactory;
const config = (env: Record<string, string>) =>
  ({ get: (k: string) => env[k] }) as unknown as ConfigService;

describe('saga providers', () => {
  it('uses logging publisher without topic', async () => {
    const pub = factory(messagePublisherProvider)(config({}));
    expect(pub).toBeInstanceOf(LoggingMessagePublisher);
    await (pub as LoggingMessagePublisher).publish({
      topic: 't',
      payload: {},
      correlationId: 'c',
    });
  });

  it('uses SNS publisher with topic', () => {
    const pub = factory(messagePublisherProvider)(
      config({ SAGA_SNS_TOPIC_ARN: 'arn', AWS_REGION: 'us-east-1' }),
    );
    expect(pub).toBeInstanceOf(SnsMessagePublisher);
  });

  it('no consumer without queue url', () => {
    expect(factory(sagaConsumerProvider)(config({}), {})).toBeNull();
  });

  it('starts consumer with queue url', () => {
    const start = jest
      .spyOn(SagaEventConsumer.prototype, 'start')
      .mockImplementation(() => undefined);
    const c = factory(sagaConsumerProvider)(
      config({ SAGA_SQS_QUEUE_URL: 'q', AWS_REGION: 'us-east-1' }),
      {},
    );
    expect(c).toBeInstanceOf(SagaEventConsumer);
    expect(start).toHaveBeenCalled();
  });
});

describe('SnsMessagePublisher', () => {
  it('publishes with type and correlation attributes', async () => {
    const send = jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({});
    const pub = new SnsMessagePublisher({ send } as never, 'arn');
    await pub.publish({
      topic: 'billing.CreatePayment',
      payload: { orderId: 'o1' },
      correlationId: 'o1',
    });
    const cmd = send.mock.calls[0][0] as PublishCommand;
    expect(cmd).toBeInstanceOf(PublishCommand);
    expect(cmd.input.MessageAttributes?.type.StringValue).toBe(
      'billing.CreatePayment',
    );
    expect(cmd.input.Message).toBe('{"orderId":"o1"}');
  });
});
