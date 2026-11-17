import { OrderSagaOrchestrator } from './order-saga.orchestrator';
import { OrderStatus } from '../enums/order-status.enum';
import { SagaCommands } from './saga-events';
import { NotFoundException } from '@nestjs/common';

describe('OrderSagaOrchestrator', () => {
  let order: { id: string; status: OrderStatus; [k: string]: unknown } | null;
  const orders = {
    findById: jest.fn(() => Promise.resolve(order)),
    save: jest.fn((o: unknown) => Promise.resolve(o)),
  };
  const publisher = { publish: jest.fn(() => Promise.resolve()) };
  const saga = new OrderSagaOrchestrator(orders as never, publisher);

  const given = (status: OrderStatus) => {
    order = { id: 'o1', status };
  };
  const topics = () =>
    publisher.publish.mock.calls.map(
      (c: unknown[]) => (c[0] as { topic: string }).topic,
    );

  beforeEach(() => jest.clearAllMocks());

  it('start emits GenerateBudget with items', async () => {
    const budget = {
      total: 10,
      items: [
        {
          kind: 'SERVICE' as const,
          referenceId: 's',
          quantity: 1,
          unitPrice: 10,
        },
      ],
    };
    await saga.start('o1', budget);
    expect(topics()).toEqual([SagaCommands.GENERATE_BUDGET]);
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { orderId: 'o1', ...budget } }),
    );
  });

  it('BudgetGenerated → AWAITING_APPROVAL', async () => {
    given(OrderStatus.IN_DIAGNOSIS);
    await saga.handle({ type: 'BudgetGenerated', orderId: 'o1', total: 10 });
    expect(order!.status).toBe(OrderStatus.AWAITING_APPROVAL);
  });

  it('BudgetApproved → AWAITING_PAYMENT and CreatePayment', async () => {
    given(OrderStatus.AWAITING_APPROVAL);
    await saga.handle({ type: 'BudgetApproved', orderId: 'o1' });
    expect(order!.status).toBe(OrderStatus.AWAITING_PAYMENT);
    expect(topics()).toEqual([SagaCommands.CREATE_PAYMENT]);
  });

  it('PaymentConfirmed → IN_EXECUTION and ReserveAndEnqueue', async () => {
    given(OrderStatus.AWAITING_PAYMENT);
    await saga.handle({
      type: 'PaymentConfirmed',
      orderId: 'o1',
      paymentId: 'p',
    });
    expect(order!.status).toBe(OrderStatus.IN_EXECUTION);
    expect(order!.startedAt).toBeInstanceOf(Date);
    expect(topics()).toEqual([SagaCommands.RESERVE_AND_ENQUEUE]);
  });

  it('PaymentConfirmed sends the parts to reserve', async () => {
    order = {
      id: 'o1',
      status: OrderStatus.AWAITING_PAYMENT,
      parts: [{ partId: 'pt', quantity: 2, unitPrice: '10.00' }],
    };
    await saga.handle({
      type: 'PaymentConfirmed',
      orderId: 'o1',
      paymentId: 'p',
    });
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          orderId: 'o1',
          paymentId: 'p',
          parts: [{ partId: 'pt', quantity: 2 }],
        },
      }),
    );
  });

  it('is idempotent on redelivery', async () => {
    given(OrderStatus.AWAITING_PAYMENT);
    await saga.handle({ type: 'BudgetApproved', orderId: 'o1' });
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(orders.save).not.toHaveBeenCalled();
  });

  it('ignores invalid transitions', async () => {
    given(OrderStatus.DELIVERED);
    await saga.handle({ type: 'ExecutionFinished', orderId: 'o1' });
    expect(order!.status).toBe(OrderStatus.DELIVERED);
  });

  it('ExecutionQueued is a no-op; ExecutionFinished → FINISHED', async () => {
    given(OrderStatus.IN_EXECUTION);
    await saga.handle({ type: 'ExecutionQueued', orderId: 'o1' });
    await saga.handle({ type: 'ExecutionFinished', orderId: 'o1' });
    expect(order!.status).toBe(OrderStatus.FINISHED);
  });

  it('BudgetRejected compensates to RECEIVED', async () => {
    given(OrderStatus.AWAITING_APPROVAL);
    await saga.handle({ type: 'BudgetRejected', orderId: 'o1' });
    expect(order!.status).toBe(OrderStatus.RECEIVED);
  });

  it.each(['BudgetFailed', 'PaymentFailed'] as const)(
    '%s compensates to CANCELLED',
    async (type) => {
      given(OrderStatus.AWAITING_PAYMENT);
      await saga.handle({ type, orderId: 'o1', reason: 'x' });
      expect(order!.status).toBe(OrderStatus.CANCELLED);
    },
  );

  it('StockUnavailable refunds and cancels', async () => {
    given(OrderStatus.IN_EXECUTION);
    await saga.handle({
      type: 'StockUnavailable',
      orderId: 'o1',
      paymentId: 'p',
    });
    expect(topics()).toEqual([SagaCommands.REFUND_PAYMENT]);
    expect(order!.status).toBe(OrderStatus.CANCELLED);
  });

  it('throws when order does not exist', async () => {
    order = null;
    await expect(
      saga.handle({ type: 'BudgetApproved', orderId: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
