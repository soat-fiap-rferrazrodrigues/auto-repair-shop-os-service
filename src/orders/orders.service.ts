import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ServiceOrder } from './entities/service-order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { EmailWebhookDto, EmailAction } from './dto/email-webhook.dto';
import { OrderStatus } from './enums/order-status.enum';
import { OrdersRepository } from './repositories/orders.repository';
import { OrderListItem, TrackOrderResponse } from './mappers/order.mapper';
import {
  CreateOrderUseCase,
  UpdateOrderStatusUseCase,
  ListOrdersUseCase,
  TrackOrderUseCase,
} from './use-cases';
import { OrderSagaOrchestrator } from './saga/order-saga.orchestrator';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private readonly listOrdersUseCase: ListOrdersUseCase,
    private readonly trackOrderUseCase: TrackOrderUseCase,
    private readonly saga: OrderSagaOrchestrator,
  ) {}

  async create(dto: CreateOrderDto): Promise<ServiceOrder> {
    return this.createOrderUseCase.execute(dto);
  }

  async findAll(): Promise<OrderListItem[]> {
    return this.listOrdersUseCase.execute();
  }

  async findOne(id: string): Promise<ServiceOrder> {
    const order = await this.ordersRepository.findById(id);
    if (!order) throw new NotFoundException('Service order not found');
    return order;
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<ServiceOrder> {
    return this.updateOrderStatusUseCase.execute(id, dto);
  }

  startDiagnosis(id: string): Promise<ServiceOrder> {
    return this.updateStatus(id, { status: OrderStatus.IN_DIAGNOSIS });
  }

  /**
   * Diagnosis finished: the order awaits approval and the saga asks billing
   * for the formal budget. A later `BudgetGenerated` is an idempotent no-op.
   * Broker failures are logged, not propagated (no outbox yet).
   */
  async sendBudget(id: string): Promise<ServiceOrder> {
    const order = await this.updateStatus(id, {
      status: OrderStatus.AWAITING_APPROVAL,
    });
    try {
      await this.saga.start(id, {
        total: Number(order.totalPrice),
        items: [
          ...(order.services ?? []).map((s) => ({
            kind: 'SERVICE' as const,
            referenceId: s.serviceId,
            quantity: 1,
            unitPrice: Number(s.price),
          })),
          ...(order.parts ?? []).map((p) => ({
            kind: 'PART' as const,
            referenceId: p.partId,
            quantity: p.quantity,
            unitPrice: Number(p.unitPrice),
          })),
        ],
      });
    } catch (err) {
      this.logger.error(
        `saga start failed orderId=${id}: ${(err as Error).message}`,
      );
    }
    return order;
  }

  /** Approval → AWAITING_PAYMENT + billing.CreatePayment (saga). */
  async approveBudget(id: string): Promise<ServiceOrder> {
    await this.findOne(id);
    await this.saga.handle({ type: 'BudgetApproved', orderId: id });
    return this.findOne(id);
  }

  /** Rejection → compensation back to RECEIVED (saga). */
  async rejectBudget(id: string): Promise<ServiceOrder> {
    await this.findOne(id);
    await this.saga.handle({ type: 'BudgetRejected', orderId: id });
    return this.findOne(id);
  }

  finishExecution(id: string): Promise<ServiceOrder> {
    return this.updateStatus(id, { status: OrderStatus.FINISHED });
  }

  deliver(id: string): Promise<ServiceOrder> {
    return this.updateStatus(id, { status: OrderStatus.DELIVERED });
  }

  async trackOrder(
    id: string,
    requestingUser: { role: string; clientId: string | null },
  ): Promise<TrackOrderResponse> {
    return this.trackOrderUseCase.execute(id, requestingUser);
  }

  /**
   * Processes an inbound email webhook (e.g. from SendGrid/Mailgun)
   * to approve or reject a budget based on client email response.
   */
  async handleEmailWebhook(dto: EmailWebhookDto): Promise<ServiceOrder> {
    this.logger.log(
      `Email webhook received: action=${dto.action}, orderId=${dto.orderId}, from=${dto.from}`,
    );

    const order = await this.findOne(dto.orderId);

    if (order.status !== OrderStatus.AWAITING_APPROVAL) {
      this.logger.warn(
        `Order ${dto.orderId} is not awaiting approval (current: ${order.status}). Ignoring.`,
      );
      return order;
    }

    // Approval → AWAITING_PAYMENT + billing.CreatePayment;
    // rejection → compensation back to RECEIVED.
    await this.saga.handle(
      dto.action === EmailAction.APPROVE
        ? { type: 'BudgetApproved', orderId: dto.orderId }
        : { type: 'BudgetRejected', orderId: dto.orderId },
    );
    return this.findOne(dto.orderId);
  }
}
