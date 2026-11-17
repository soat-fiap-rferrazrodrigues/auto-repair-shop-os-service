import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../repositories/orders.repository';
import { OrderStatus } from '../enums/order-status.enum';
import { ServiceOrder } from '../entities/service-order.entity';
import { STATUS_FLOW } from '../use-cases/update-order-status.use-case';
import { MessagePublisher } from '../../common/messaging/message-publisher';
import { BudgetRequest, SagaCommands, SagaEvent } from './saga-events';

/**
 * Orchestrated saga: OS opened → budget → approval → payment → execution.
 * Each failure event triggers the matching compensation.
 */
@Injectable()
export class OrderSagaOrchestrator {
  private readonly logger = new Logger(OrderSagaOrchestrator.name);

  constructor(
    private readonly orders: OrdersRepository,
    private readonly publisher: MessagePublisher,
  ) {}

  /** Billing owns no copy of the order, so the command carries the frozen items. */
  async start(orderId: string, budget: BudgetRequest): Promise<void> {
    await this.send(SagaCommands.GENERATE_BUDGET, orderId, {
      items: budget.items,
      total: budget.total,
    });
  }

  async handle(event: SagaEvent): Promise<void> {
    this.logger.log(`saga event=${event.type} orderId=${event.orderId}`);

    switch (event.type) {
      case 'BudgetGenerated':
        await this.transition(event.orderId, OrderStatus.AWAITING_APPROVAL);
        return;
      case 'BudgetApproved':
        if (await this.transition(event.orderId, OrderStatus.AWAITING_PAYMENT))
          await this.send(SagaCommands.CREATE_PAYMENT, event.orderId, {});
        return;
      case 'PaymentConfirmed': {
        const order = await this.transition(
          event.orderId,
          OrderStatus.IN_EXECUTION,
        );
        // Execution owns the stock now, so it receives the parts to reserve.
        if (order)
          await this.send(SagaCommands.RESERVE_AND_ENQUEUE, event.orderId, {
            paymentId: event.paymentId,
            parts: (order.parts ?? []).map((p) => ({
              partId: p.partId,
              quantity: p.quantity,
            })),
          });
        return;
      }
      case 'ExecutionQueued':
        return;
      case 'ExecutionFinished':
        await this.transition(event.orderId, OrderStatus.FINISHED);
        return;

      // ── Compensations ───────────────────────────────────────────────
      case 'BudgetRejected':
        await this.transition(event.orderId, OrderStatus.RECEIVED);
        return;
      case 'BudgetFailed':
      case 'PaymentFailed':
        await this.transition(event.orderId, OrderStatus.CANCELLED);
        return;
      case 'StockUnavailable':
        await this.send(SagaCommands.REFUND_PAYMENT, event.orderId, {
          paymentId: event.paymentId,
        });
        await this.transition(event.orderId, OrderStatus.CANCELLED);
        return;
    }
  }

  /**
   * Idempotent: re-delivered events for an order already in `status` are ignored.
   * Returns the saved order, or null when nothing changed.
   */
  private async transition(
    orderId: string,
    status: OrderStatus,
  ): Promise<ServiceOrder | null> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundException('Service order not found');
    if (order.status === status) return null;
    if (!STATUS_FLOW[order.status].includes(status)) {
      this.logger.warn(
        `ignored transition ${order.status} → ${status} orderId=${orderId}`,
      );
      return null;
    }

    order.status = status;
    const now = new Date();
    if (status === OrderStatus.IN_EXECUTION) {
      order.approvedAt ??= now;
      order.startedAt = now;
    }
    if (status === OrderStatus.FINISHED) order.finishedAt = now;
    await this.orders.save(order);
    return order;
  }

  private send(
    topic: string,
    orderId: string,
    extra: Record<string, unknown>,
  ): Promise<void> {
    return this.publisher.publish({
      topic,
      correlationId: orderId,
      payload: { orderId, ...extra },
    });
  }
}
