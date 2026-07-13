import { Injectable } from '@nestjs/common';
import { ServiceOrder } from '../entities/service-order.entity';
import { OrderServiceItem } from '../entities/order-service.entity';
import { OrderPart } from '../entities/order-part.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderStatus } from '../enums/order-status.enum';
import { ServicesService } from '../../services/services.service';
import { PartsService } from '../../parts/parts.service';
import { VehiclesService } from '../../vehicles/vehicles.service';
import { OrdersRepository } from '../repositories/orders.repository';

@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly servicesService: ServicesService,
    private readonly partsService: PartsService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async execute(dto: CreateOrderDto): Promise<ServiceOrder> {
    await this.vehiclesService.findOne(dto.vehicleId);

    let totalPrice = 0;

    const serviceItems: Partial<OrderServiceItem>[] = [];
    for (const item of dto.services) {
      const service = await this.servicesService.findOne(item.serviceId);
      serviceItems.push({ serviceId: item.serviceId, price: service.price });
      totalPrice += Number(service.price);
    }

    const partItems: Partial<OrderPart>[] = [];
    if (dto.parts) {
      for (const item of dto.parts) {
        const part = await this.partsService.findOne(item.partId);
        partItems.push({
          partId: item.partId,
          quantity: item.quantity,
          unitPrice: part.unitPrice,
        });
        totalPrice += Number(part.unitPrice) * item.quantity;
      }
    }

    const order = this.ordersRepository.create({
      vehicleId: dto.vehicleId,
      status: OrderStatus.RECEIVED,
      totalPrice,
      services: serviceItems as OrderServiceItem[],
      parts: partItems as OrderPart[],
    });

    return this.ordersRepository.save(order);
  }
}
