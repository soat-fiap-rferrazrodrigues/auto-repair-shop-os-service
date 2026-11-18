import { ConfigService } from '@nestjs/config';
import { PublishCommand } from '@aws-sdk/client-sns';
import {
  commandConsumerProvider,
  eventPublisherProvider,
  mercadoPagoProvider,
} from './providers';
import {
  LoggingEventPublisher,
  SnsEventPublisher,
} from './messaging/event-publisher';
import { CommandConsumer } from './messaging/command.consumer';
import { MercadoPagoClient } from './mercadopago/mercadopago.client';
import { HealthController } from './health/health.controller';

type Factory = (...args: unknown[]) => unknown;
const factory = (p: unknown) => (p as { useFactory: Factory }).useFactory;
const config = (env: Record<string, string>) =>
  ({
    get: (k: string) => env[k],
    getOrThrow: (k: string) => {
      if (!env[k]) throw new Error(`missing ${k}`);
      return env[k];
    },
  }) as unknown as ConfigService;

describe('providers', () => {
  it('logging publisher without topic', async () => {
    const p = factory(eventPublisherProvider)(
      config({}),
    ) as LoggingEventPublisher;
    expect(p).toBeInstanceOf(LoggingEventPublisher);
    await p.publish({ type: 'BudgetGenerated', orderId: 'o', total: 1 });
  });

  it('SNS publisher with topic', () => {
    expect(
      factory(eventPublisherProvider)(
        config({ BILLING_SNS_TOPIC_ARN: 'arn', AWS_REGION: 'us-east-1' }),
      ),
    ).toBeInstanceOf(SnsEventPublisher);
  });

  it('consumer only with queue url', () => {
    expect(factory(commandConsumerProvider)(config({}), {})).toBeNull();
    const start = jest
      .spyOn(CommandConsumer.prototype, 'start')
      .mockImplementation(() => undefined);
    expect(
      factory(commandConsumerProvider)(
        config({ BILLING_SQS_QUEUE_URL: 'q', AWS_REGION: 'us-east-1' }),
        {},
      ),
    ).toBeInstanceOf(CommandConsumer);
    expect(start).toHaveBeenCalled();
  });

  it('Mercado Pago client requires access token', () => {
    expect(() => factory(mercadoPagoProvider)(config({}))).toThrow(
      'MP_ACCESS_TOKEN',
    );
    expect(
      factory(mercadoPagoProvider)(config({ MP_ACCESS_TOKEN: 't' })),
    ).toBeInstanceOf(MercadoPagoClient);
  });
});

describe('SnsEventPublisher', () => {
  it('publishes body with type and attributes', async () => {
    const send = jest
      .fn<Promise<unknown>, [PublishCommand]>()
      .mockResolvedValue({});
    await new SnsEventPublisher({ send } as never, 'arn').publish({
      type: 'PaymentConfirmed',
      orderId: 'o1',
      paymentId: '1',
    });
    const cmd = send.mock.calls[0][0];
    expect(JSON.parse(cmd.input.Message!)).toEqual({
      type: 'PaymentConfirmed',
      orderId: 'o1',
      paymentId: '1',
    });
    expect(cmd.input.MessageAttributes?.type.StringValue).toBe(
      'PaymentConfirmed',
    );
  });
});

describe('HealthController', () => {
  it('reports up and down', async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([1])
        .mockRejectedValueOnce(new Error()),
    };
    const h = new HealthController(db as never);
    await expect(h.check()).resolves.toMatchObject({ status: 'ok' });
    await expect(h.check()).resolves.toMatchObject({ status: 'degraded' });
  });
});
