import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ServiceOrder } from '../entities/service-order.entity';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrderStatus } from '../enums/order-status.enum';
import { PartsService } from '../../parts/parts.service';
import { OrdersRepository } from '../repositories/orders.repository';

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.RECEIVED]: [OrderStatus.IN_DIAGNOSIS],
  [OrderStatus.IN_DIAGNOSIS]: [OrderStatus.AWAITING_APPROVAL],
  [OrderStatus.AWAITING_APPROVAL]: [
    OrderStatus.IN_EXECUTION,
    OrderStatus.RECEIVED,
  ],
  [OrderStatus.IN_EXECUTION]: [OrderStatus.FINISHED],
  [OrderStatus.FINISHED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
};

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly partsService: PartsService,
  ) {}

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
        if (order.parts) {
          for (const item of order.parts) {
            await this.partsService.decreaseStock(item?.partId, item?.quantity);
          }
        }
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
