import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../orders/repositories/orders.repository';
import { ReportMapper } from './mappers/report.mapper';

@Injectable()
export class ReportsService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async getAverageExecutionTime() {
    const result = await this.ordersRepository.getAverageExecutionTime();
    return ReportMapper.toAverageTime(result);
  }

  getOrdersByStatus() {
    return this.ordersRepository.getOrdersByStatus();
  }

  async getDashboard() {
    const [avgTime, byStatus] = await Promise.all([
      this.getAverageExecutionTime(),
      this.getOrdersByStatus(),
    ]);
    return ReportMapper.toDashboard(avgTime, byStatus);
  }
}
