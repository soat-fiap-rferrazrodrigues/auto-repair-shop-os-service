import { BillingService } from './billing.service';
import { PaymentStatus } from './entities/payment.entity';
import { BillingEvent } from '../messaging/event-publisher';

type Row = Record<string, unknown>;

const repo = () => {
  const rows = new Map<string, Row>();
  return {
    rows,
    findOne: jest.fn(({ where }: { where: { orderId: string } }) =>
      Promise.resolve(rows.get(where.orderId) ?? null),
    ),
    create: jest.fn((r: Row) => ({ ...r })),
    save: jest.fn((r: Row) => {
      rows.set(r.orderId as string, r);
      return Promise.resolve(r);
    }),
  };
};

describe('BillingService', () => {
  let budgets: ReturnType<typeof repo>;
  let payments: ReturnType<typeof repo>;
  let events: BillingEvent[];
  const mp = {
    createPreference: jest.fn(),
    getPayment: jest.fn(),
    refund: jest.fn(),
  };
  let service: BillingService;

  const item = {
    kind: 'SERVICE' as const,
    referenceId: 's',
    quantity: 2,
    unitPrice: 50,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    budgets = repo();
    payments = repo();
    events = [];
    service = new BillingService(
      budgets as never,
      payments as never,
      mp as never,
      {
        publish: (e: BillingEvent) => {
          events.push(e);
          return Promise.resolve();
        },
      },
    );
  });

  describe('generateBudget', () => {
    it('stores budget and publishes BudgetGenerated', async () => {
      await service.generateBudget({
        orderId: 'o1',
        items: [item],
        total: 100,
      });
      expect(budgets.rows.get('o1')).toMatchObject({ total: '100.00' });
      expect(events).toEqual([
        { type: 'BudgetGenerated', orderId: 'o1', total: 100 },
      ]);
    });

    it('overwrites an existing budget (regenerated after rejection)', async () => {
      budgets.rows.set('o1', { orderId: 'o1', total: '10.00', items: [] });
      await service.generateBudget({
        orderId: 'o1',
        items: [item],
        total: 100,
      });
      expect(budgets.rows.get('o1')).toMatchObject({
        total: '100.00',
        items: [item],
      });
    });

    it.each([
      [{ items: [], total: 0 }, 'budget has no items'],
      [{ items: [item], total: 99 }, 'total mismatch'],
      [{ items: [{ ...item, unitPrice: 0 }], total: 0 }, 'must be positive'],
    ])('rejects invalid budget %#', async (cmd, reason) => {
      await service.generateBudget({ orderId: 'o1', ...cmd });
      expect(events[0]).toMatchObject({ type: 'BudgetFailed' });
      expect((events[0] as { reason: string }).reason).toContain(reason);
      expect(budgets.save).not.toHaveBeenCalled();
    });

    it('fails when the order is already paid', async () => {
      payments.rows.set('o1', {
        orderId: 'o1',
        status: PaymentStatus.APPROVED,
      });
      await service.generateBudget({
        orderId: 'o1',
        items: [item],
        total: 100,
      });
      expect(events[0]).toMatchObject({
        type: 'BudgetFailed',
        reason: 'order already paid',
      });
    });
  });

  describe('createPayment', () => {
    beforeEach(() => {
      budgets.rows.set('o1', { orderId: 'o1', total: '100.00' });
    });

    it('creates a Mercado Pago preference', async () => {
      mp.createPreference.mockResolvedValue({
        id: 'pref',
        init_point: 'https://mp/x',
      });
      const p = await service.createPayment('o1');
      expect(mp.createPreference).toHaveBeenCalledWith({
        orderId: 'o1',
        amount: 100,
      });
      expect(p).toMatchObject({
        status: PaymentStatus.PENDING,
        preferenceId: 'pref',
        checkoutUrl: 'https://mp/x',
        amount: '100.00',
      });
      expect(events).toEqual([]);
    });

    it('is idempotent for a pending payment of the same amount', async () => {
      payments.rows.set('o1', {
        orderId: 'o1',
        amount: '100.00',
        status: PaymentStatus.PENDING,
      });
      await service.createPayment('o1');
      expect(mp.createPreference).not.toHaveBeenCalled();
    });

    it('recreates the preference after a rejected payment', async () => {
      payments.rows.set('o1', {
        orderId: 'o1',
        amount: '100.00',
        status: PaymentStatus.REJECTED,
        mpPaymentId: '9',
      });
      mp.createPreference.mockResolvedValue({ id: 'pref2', init_point: 'u' });
      const p = await service.createPayment('o1');
      expect(p).toMatchObject({
        preferenceId: 'pref2',
        status: PaymentStatus.PENDING,
        mpPaymentId: null,
      });
    });

    it('publishes PaymentFailed when the budget is missing', async () => {
      expect(await service.createPayment('nope')).toBeNull();
      expect(events[0]).toMatchObject({
        type: 'PaymentFailed',
        reason: 'budget not found',
      });
    });

    it('publishes PaymentFailed when Mercado Pago fails', async () => {
      mp.createPreference.mockRejectedValue(new Error('503'));
      expect(await service.createPayment('o1')).toBeNull();
      expect(events[0]).toMatchObject({ type: 'PaymentFailed' });
    });
  });

  describe('handlePaymentNotification', () => {
    beforeEach(() => {
      payments.rows.set('o1', {
        orderId: 'o1',
        amount: '100.00',
        status: PaymentStatus.PENDING,
      });
    });

    it('approved → PaymentConfirmed', async () => {
      mp.getPayment.mockResolvedValue({
        id: 123,
        status: 'approved',
        external_reference: 'o1',
      });
      await service.handlePaymentNotification('123');
      expect(payments.rows.get('o1')).toMatchObject({
        status: PaymentStatus.APPROVED,
        mpPaymentId: '123',
      });
      expect(events).toEqual([
        { type: 'PaymentConfirmed', orderId: 'o1', paymentId: '123' },
      ]);
    });

    it('rejected → PaymentFailed', async () => {
      mp.getPayment.mockResolvedValue({
        id: 1,
        status: 'rejected',
        external_reference: 'o1',
      });
      await service.handlePaymentNotification('1');
      expect(events[0]).toMatchObject({ type: 'PaymentFailed', orderId: 'o1' });
    });

    it('ignores pending, duplicates and terminal states', async () => {
      mp.getPayment.mockResolvedValue({
        id: 1,
        status: 'in_process',
        external_reference: 'o1',
      });
      await service.handlePaymentNotification('1');

      payments.rows.get('o1')!.status = PaymentStatus.APPROVED;
      mp.getPayment.mockResolvedValue({
        id: 1,
        status: 'approved',
        external_reference: 'o1',
      });
      await service.handlePaymentNotification('1');
      mp.getPayment.mockResolvedValue({
        id: 1,
        status: 'rejected',
        external_reference: 'o1',
      });
      await service.handlePaymentNotification('1');

      expect(events).toEqual([]);
    });

    it('ignores payments without reference or unknown order', async () => {
      mp.getPayment.mockResolvedValueOnce({
        id: 1,
        status: 'approved',
        external_reference: null,
      });
      await service.handlePaymentNotification('1');
      mp.getPayment.mockResolvedValueOnce({
        id: 1,
        status: 'approved',
        external_reference: 'x',
      });
      await service.handlePaymentNotification('1');
      expect(events).toEqual([]);
    });
  });

  describe('refundPayment', () => {
    it('refunds a captured payment once', async () => {
      payments.rows.set('o1', {
        orderId: 'o1',
        status: PaymentStatus.APPROVED,
        mpPaymentId: '123',
      });
      mp.refund.mockResolvedValue({});
      await service.refundPayment('o1');
      await service.refundPayment('o1');
      expect(mp.refund).toHaveBeenCalledTimes(1);
      expect(mp.refund).toHaveBeenCalledWith('123', 'refund-o1');
      expect(payments.rows.get('o1')!.status).toBe(PaymentStatus.REFUNDED);
    });

    it('ignores orders without captured payment', async () => {
      await service.refundPayment('o1');
      expect(mp.refund).not.toHaveBeenCalled();
    });

    it('propagates provider errors for SQS retry', async () => {
      payments.rows.set('o1', {
        orderId: 'o1',
        status: PaymentStatus.APPROVED,
        mpPaymentId: '1',
      });
      mp.refund.mockRejectedValue(new Error('500'));
      await expect(service.refundPayment('o1')).rejects.toThrow('500');
      expect(payments.rows.get('o1')!.status).toBe(PaymentStatus.APPROVED);
    });
  });

  it('findPayment delegates to repository', async () => {
    payments.rows.set('o1', { orderId: 'o1' });
    expect(await service.findPayment('o1')).toEqual({ orderId: 'o1' });
  });

  it.each([
    ['approved', PaymentStatus.APPROVED],
    ['cancelled', PaymentStatus.REJECTED],
    ['charged_back', PaymentStatus.REFUNDED],
    ['refunded', PaymentStatus.REFUNDED],
    ['pending', null],
  ])('mapStatus(%s)', (s, expected) => {
    expect(BillingService.mapStatus(s)).toBe(expected);
  });
});
