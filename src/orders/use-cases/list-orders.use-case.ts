import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../repositories/orders.repository';
import { OrderMapper, OrderListItem } from '../mappers/order.mapper';
import { OrderStatus } from '../enums/order-status.enum';

const STATUS_PRIORITY: Record<string, number> = {
  [OrderStatus.IN_EXECUTION]: 1,
  [OrderStatus.AWAITING_APPROVAL]: 2,
  [OrderStatus.IN_DIAGNOSIS]: 3,
  [OrderStatus.RECEIVED]: 4,
};

@Injectable()
export class ListOrdersUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(): Promise<OrderListItem[]> {
    const orders = await this.ordersRepository.findActiveOrders();

    const sorted = orders.sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a.status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return OrderMapper.toList(sorted);
  }
}
