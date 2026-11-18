import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget, BudgetItem } from './entities/budget.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { MercadoPagoClient } from '../mercadopago/mercadopago.client';
import { EventPublisher } from '../messaging/event-publisher';

export interface GenerateBudgetCommand {
  orderId: string;
  items: BudgetItem[];
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Saga participant. Every handler is idempotent because SQS delivers
 * at-least-once and the orchestrator may resend commands.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Budget) private readonly budgets: Repository<Budget>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly mercadoPago: MercadoPagoClient,
    private readonly events: EventPublisher,
  ) {}

  // ── billing.GenerateBudget ────────────────────────────────────────
  async generateBudget(cmd: GenerateBudgetCommand): Promise<void> {
    const error = this.validateBudget(cmd);
    if (error) {
      await this.events.publish({
        type: 'BudgetFailed',
        orderId: cmd.orderId,
        reason: error,
      });
      return;
    }

    const paid = await this.payments.findOne({
      where: { orderId: cmd.orderId },
    });
    if (paid?.status === PaymentStatus.APPROVED) {
      await this.events.publish({
        type: 'BudgetFailed',
        orderId: cmd.orderId,
        reason: 'order already paid',
      });
      return;
    }

    // Upsert: after a rejection the order may come back with new items.
    const budget =
      (await this.budgets.findOne({ where: { orderId: cmd.orderId } })) ??
      this.budgets.create({ orderId: cmd.orderId });
    budget.items = cmd.items;
    budget.total = round2(cmd.total).toFixed(2);
    await this.budgets.save(budget);

    await this.events.publish({
      type: 'BudgetGenerated',
      orderId: cmd.orderId,
      total: Number(budget.total),
    });
  }

  // ── billing.CreatePayment ─────────────────────────────────────────
  async createPayment(orderId: string): Promise<Payment | null> {
    const budget = await this.budgets.findOne({ where: { orderId } });
    if (!budget) {
      await this.events.publish({
        type: 'PaymentFailed',
        orderId,
        reason: 'budget not found',
      });
      return null;
    }

    const existing = await this.payments.findOne({ where: { orderId } });
    if (
      existing &&
      existing.status !== PaymentStatus.REJECTED &&
      existing.amount === budget.total
    ) {
      return existing; // redelivery
    }

    try {
      const pref = await this.mercadoPago.createPreference({
        orderId,
        amount: Number(budget.total),
      });
      const payment = existing ?? this.payments.create({ orderId });
      payment.amount = budget.total;
      payment.status = PaymentStatus.PENDING;
      payment.preferenceId = pref.id;
      payment.checkoutUrl = pref.init_point;
      payment.mpPaymentId = null;
      return await this.payments.save(payment);
    } catch (err) {
      this.logger.error(
        `createPreference failed orderId=${orderId}: ${(err as Error).message}`,
      );
      await this.events.publish({
        type: 'PaymentFailed',
        orderId,
        reason: 'payment provider unavailable',
      });
      return null;
    }
  }

  // ── Mercado Pago webhook ──────────────────────────────────────────
  async handlePaymentNotification(mpPaymentId: string): Promise<void> {
    const mp = await this.mercadoPago.getPayment(mpPaymentId);
    const orderId = mp.external_reference;
    if (!orderId) {
      this.logger.warn(`payment ${mpPaymentId} without external_reference`);
      return;
    }
    const payment = await this.payments.findOne({ where: { orderId } });
    if (!payment) {
      this.logger.warn(`payment ${mpPaymentId} for unknown order ${orderId}`);
      return;
    }

    const next = BillingService.mapStatus(mp.status);
    if (!next || payment.status === next) return; // pending or duplicate
    if (
      payment.status === PaymentStatus.APPROVED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      return; // terminal from the saga's point of view
    }

    payment.status = next;
    payment.mpPaymentId = String(mp.id);
    await this.payments.save(payment);

    await this.events.publish(
      next === PaymentStatus.APPROVED
        ? { type: 'PaymentConfirmed', orderId, paymentId: String(mp.id) }
        : { type: 'PaymentFailed', orderId, reason: `mp status ${mp.status}` },
    );
  }

  // ── billing.RefundPayment (compensation) ──────────────────────────
  async refundPayment(orderId: string): Promise<void> {
    const payment = await this.payments.findOne({ where: { orderId } });
    if (!payment?.mpPaymentId) {
      this.logger.warn(`refund ignored: no captured payment for ${orderId}`);
      return;
    }
    if (payment.status === PaymentStatus.REFUNDED) return;

    // Errors propagate so SQS redelivers; the DLQ alarms if MP keeps failing.
    await this.mercadoPago.refund(payment.mpPaymentId, `refund-${orderId}`);
    payment.status = PaymentStatus.REFUNDED;
    await this.payments.save(payment);
    this.logger.log(`refunded orderId=${orderId} mp=${payment.mpPaymentId}`);
  }

  findPayment(orderId: string): Promise<Payment | null> {
    return this.payments.findOne({ where: { orderId } });
  }

  static mapStatus(mpStatus: string): PaymentStatus | null {
    switch (mpStatus) {
      case 'approved':
        return PaymentStatus.APPROVED;
      case 'rejected':
      case 'cancelled':
        return PaymentStatus.REJECTED;
      case 'refunded':
      case 'charged_back':
        return PaymentStatus.REFUNDED;
      default:
        return null; // pending, in_process, authorized...
    }
  }

  private validateBudget(cmd: GenerateBudgetCommand): string | null {
    if (!Array.isArray(cmd.items) || cmd.items.length === 0)
      return 'budget has no items';
    const sum = cmd.items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    if (Math.abs(round2(sum) - round2(cmd.total)) > 0.01)
      return `total mismatch: items=${round2(sum)} total=${cmd.total}`;
    if (cmd.total <= 0) return 'budget total must be positive';
    return null;
  }
}
