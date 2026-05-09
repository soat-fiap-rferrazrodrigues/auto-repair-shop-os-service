import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceOrder } from '../entities/service-order.entity';
import { OrderStatus } from '../enums/order-status.enum';

const ORDER_RELATIONS = [
  'vehicle',
  'vehicle.client',
  'services',
  'services.service',
  'parts',
  'parts.part',
];

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly repo: Repository<ServiceOrder>,
  ) {}

  create(data: Partial<ServiceOrder>): ServiceOrder {
    return this.repo.create(data);
  }

  save(order: Partial<ServiceOrder>): Promise<ServiceOrder> {
    return this.repo.save(order);
  }

  findAll(): Promise<ServiceOrder[]> {
    return this.repo.find({ relations: ORDER_RELATIONS });
  }

  findById(id: string): Promise<ServiceOrder | null> {
    return this.repo.findOne({ where: { id }, relations: ORDER_RELATIONS });
  }

  getAverageExecutionTime(): Promise<
    { avgMinutes: string; totalFinished: string } | undefined
  > {
    return this.repo
      .createQueryBuilder('order')
      .select(
        'AVG(EXTRACT(EPOCH FROM (order.finishedAt - order.startedAt)) / 60)',
        'avgMinutes',
      )
      .addSelect('COUNT(*)', 'totalFinished')
      .where('order.status IN (:...statuses)', {
        statuses: [OrderStatus.FINISHED, OrderStatus.DELIVERED],
      })
      .andWhere('order.startedAt IS NOT NULL')
      .andWhere('order.finishedAt IS NOT NULL')
      .getRawOne();
  }

  getOrdersByStatus(): Promise<{ status: string; count: string }[]> {
    return this.repo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();
  }
}
