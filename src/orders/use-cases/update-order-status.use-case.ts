import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ServiceOrder } from '../entities/service-order.entity';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrderStatus } from '../enums/order-status.enum';
import { OrdersRepository } from '../repositories/orders.repository';

export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.RECEIVED]: [OrderStatus.IN_DIAGNOSIS, OrderStatus.CANCELLED],
  [OrderStatus.IN_DIAGNOSIS]: [
    OrderStatus.AWAITING_APPROVAL,
    OrderStatus.CANCELLED,
  ],
  // Approval always goes through payment (saga); no direct jump to IN_EXECUTION.
  [OrderStatus.AWAITING_APPROVAL]: [
    OrderStatus.AWAITING_PAYMENT,
    OrderStatus.RECEIVED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.AWAITING_PAYMENT]: [
    OrderStatus.IN_EXECUTION,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.IN_EXECUTION]: [OrderStatus.FINISHED, OrderStatus.CANCELLED],
  [OrderStatus.FINISHED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(id: string, dto: UpdateOrderStatusDto): Promise<ServiceOrder> {
    const order = await this.ordersRepository.findById(id);
    if (!order) throw new NotFoundException('Service order not found');

    const allowed = STATUS_FLOW[order.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition: ${order.status} → ${dto.status}. Allowed: ${allowed.join(', ')}`,
      );
    }

    order.status = dto.status;
    const now = new Date();

    switch (dto.status) {
      case OrderStatus.IN_EXECUTION:
        order.approvedAt = now;
        order.startedAt = now;
        // Stock is reserved by execution-service (ReserveAndEnqueue, ADR-006).
        break;
      case OrderStatus.FINISHED:
        order.finishedAt = now;
        break;
      case OrderStatus.DELIVERED:
        order.deliveredAt = now;
        break;
    }

    return this.ordersRepository.save(order);
  }
}
