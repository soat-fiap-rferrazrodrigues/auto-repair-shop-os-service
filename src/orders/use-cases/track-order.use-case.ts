import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersRepository } from '../repositories/orders.repository';
import { OrderMapper, TrackOrderResponse } from '../mappers/order.mapper';

@Injectable()
export class TrackOrderUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(
    id: string,
    requestingUser: { role: string; clientId: string | null },
  ): Promise<TrackOrderResponse> {
    const order = await this.ordersRepository.findById(id);
    if (!order) throw new NotFoundException('Service order not found');

    if (requestingUser.role === 'client') {
      if (
        !requestingUser.clientId ||
        order.vehicle.clientId !== requestingUser.clientId
      ) {
        throw new ForbiddenException(
          'Access denied: this service order does not belong to your account',
        );
      }
    }

    return OrderMapper.toTrackResponse(order);
  }
}
