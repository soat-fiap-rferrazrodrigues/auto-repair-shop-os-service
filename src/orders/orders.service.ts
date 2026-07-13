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

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private readonly listOrdersUseCase: ListOrdersUseCase,
    private readonly trackOrderUseCase: TrackOrderUseCase,
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

  sendBudget(id: string): Promise<ServiceOrder> {
    return this.updateStatus(id, { status: OrderStatus.AWAITING_APPROVAL });
  }

  approveBudget(id: string): Promise<ServiceOrder> {
    return this.updateStatus(id, { status: OrderStatus.IN_EXECUTION });
  }

  rejectBudget(id: string): Promise<ServiceOrder> {
    return this.updateStatus(id, { status: OrderStatus.RECEIVED });
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

    if (dto.action === EmailAction.APPROVE) {
      return this.approveBudget(dto.orderId);
    } else {
      return this.rejectBudget(dto.orderId);
    }
  }
}
