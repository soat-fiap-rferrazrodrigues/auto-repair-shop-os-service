import * as path from 'path';
import { Test } from '@nestjs/testing';
import { defineFeature, loadFeature, DefineStepFunction } from 'jest-cucumber';
import { OrdersService } from '../orders.service';
import { OrdersRepository } from '../repositories/orders.repository';
import { OrderSagaOrchestrator } from './order-saga.orchestrator';
import { SagaEvent } from './saga-events';
import { OrderStatus } from '../enums/order-status.enum';
import { EmailAction } from '../dto/email-webhook.dto';
import {
  MessagePublisher,
  OutgoingMessage,
} from '../../common/messaging/message-publisher';
import {
  CreateOrderUseCase,
  ListOrdersUseCase,
  TrackOrderUseCase,
  UpdateOrderStatusUseCase,
} from '../use-cases';
import { ServicesService } from '../../services/services.service';
import { PartsService } from '../../parts/parts.service';
import { VehiclesService } from '../../vehicles/vehicles.service';

const feature = loadFeature(
  path.join(__dirname, 'features', 'order-saga.feature'),
);

type StoredOrder = { id: string; status: OrderStatus; parts: unknown[] };
const ORDER_ID = 'os-1';

defineFeature(feature, (test) => {
  let store: Map<string, StoredOrder>;
  let published: OutgoingMessage[];
  let service: OrdersService;
  let saga: OrderSagaOrchestrator;

  beforeEach(async () => {
    store = new Map();
    published = [];
    const repo = {
      findById: (id: string) => Promise.resolve(store.get(id) ?? null),
      save: (o: StoredOrder) => {
        store.set(o.id, { ...o });
        return Promise.resolve({ ...o });
      },
    };
    const publisher: MessagePublisher = {
      publish: (m: OutgoingMessage) => {
        published.push(m);
        return Promise.resolve();
      },
    };

    // Real service + orchestrator + use cases; only I/O edges are faked.
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        OrderSagaOrchestrator,
        CreateOrderUseCase,
        UpdateOrderStatusUseCase,
        ListOrdersUseCase,
        TrackOrderUseCase,
        { provide: OrdersRepository, useValue: repo },
        { provide: MessagePublisher, useValue: publisher },
        { provide: ServicesService, useValue: {} },
        { provide: PartsService, useValue: { decreaseStock: jest.fn() } },
        { provide: VehiclesService, useValue: {} },
      ],
    }).compile();

    service = module.get(OrdersService);
    saga = module.get(OrderSagaOrchestrator);
  });

  const givenOrder = (status: OrderStatus) =>
    store.set(ORDER_ID, { id: ORDER_ID, status, parts: [] });

  const statusOf = () => store.get(ORDER_ID)!.status;

  // ── reusable steps ────────────────────────────────────────────────
  const orderInDiagnosis = (given: DefineStepFunction) => {
    given('uma OS em diagnóstico', () => {
      givenOrder(OrderStatus.IN_DIAGNOSIS);
    });
  };

  const sendBudget = (when: DefineStepFunction) => {
    when('o orçamento é enviado ao cliente', async () => {
      await service.sendBudget(ORDER_ID);
    });
  };

  const statusIs = (then: DefineStepFunction) => {
    then(/^a OS deve estar em "(.*)"$/, (status: string) => {
      expect(statusOf()).toBe(status);
    });
  };

  const commandPublished = (then: DefineStepFunction) => {
    then(/^o comando "(.*)" deve ser publicado$/, (topic: string) => {
      const last = published.at(-1);
      expect(last?.topic).toBe(topic);
      expect(last?.correlationId).toBe(ORDER_ID);
    });
  };

  const servicePublishes = (when: DefineStepFunction) => {
    when(
      /^o (?:billing|execution) publica "(.*)"$/,
      async (type: SagaEvent['type']) => {
        await saga.handle({
          type,
          orderId: ORDER_ID,
          paymentId: 'mp-123',
        } as SagaEvent);
      },
    );
  };

  const emailWebhook = (when: DefineStepFunction) => {
    when(
      /^o cliente (aprova|rejeita) o orçamento por e-mail$/,
      async (verb: string) => {
        await service.handleEmailWebhook({
          orderId: ORDER_ID,
          from: 'cliente@exemplo.com',
          action: verb === 'aprova' ? EmailAction.APPROVE : EmailAction.REJECT,
        });
      },
    );
  };

  // ── scenarios ─────────────────────────────────────────────────────
  test('Fluxo completo com pagamento aprovado', ({
    given,
    when,
    then,
    and,
  }) => {
    orderInDiagnosis(given);
    sendBudget(when);
    statusIs(then);
    commandPublished(and);
    emailWebhook(when);
    statusIs(then);
    commandPublished(and);
    servicePublishes(when);
    statusIs(then);
    commandPublished(and);
    servicePublishes(when);
    statusIs(then);
  });

  test('Cliente rejeita o orçamento', ({ given, when, and, then }) => {
    orderInDiagnosis(given);
    sendBudget(when);
    emailWebhook(and);
    statusIs(then);
  });

  test('Pagamento recusado cancela a OS', ({ given, when, then }) => {
    given('uma OS aguardando pagamento', () =>
      givenOrder(OrderStatus.AWAITING_PAYMENT),
    );
    servicePublishes(when);
    statusIs(then);
  });

  test('Falta de estoque estorna o pagamento', ({ given, when, then, and }) => {
    given('uma OS em execução com pagamento confirmado', () =>
      givenOrder(OrderStatus.IN_EXECUTION),
    );
    servicePublishes(when);
    commandPublished(then);
    statusIs(and);
  });
});
