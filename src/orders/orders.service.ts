import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ServiceOrder } from './entities/service-order.entity';
import { OrderServiceItem } from './entities/order-service.entity';
import { OrderPart } from './entities/order-part.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from './enums/order-status.enum';
import { ServicesService } from '../services/services.service';
import { PartsService } from '../parts/parts.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { OrdersRepository } from './repositories/orders.repository';
import { OrderMapper } from './mappers/order.mapper';

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
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly servicesService: ServicesService,
    private readonly partsService: PartsService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async create(dto: CreateOrderDto): Promise<ServiceOrder> {
    // Validate vehicle exists
    await this.vehiclesService.findOne(dto.vehicleId);

    // Build order service items and calculate total
    let totalPrice = 0;
    const serviceItems: Partial<OrderServiceItem>[] = [];
    for (const item of dto.services) {
      const service = await this.servicesService.findOne(item.serviceId);
      serviceItems.push({
        serviceId: item.serviceId,
        price: service.price,
      });
      totalPrice += Number(service.price);
    }

    // Build order part items
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

    // Create order
    const order = this.ordersRepository.create({
      vehicleId: dto.vehicleId,
      status: OrderStatus.RECEIVED,
      totalPrice,
      services: serviceItems as OrderServiceItem[],
      parts: partItems as OrderPart[],
    });

    return this.ordersRepository.save(order);
  }

  findAll(): Promise<ServiceOrder[]> {
    return this.ordersRepository.findAll();
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
    const order = await this.findOne(id);
    const allowed = STATUS_FLOW[order.status];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition: ${order.status} → ${dto.status}. Allowed: ${allowed.join(', ')}`,
      );
    }

    order.status = dto.status;

    // Set timestamps automatically
    const now = new Date();
    switch (dto.status) {
      case OrderStatus.AWAITING_APPROVAL:
        // Budget generated, send to client
        break;
      case OrderStatus.IN_EXECUTION:
        order.approvedAt = now;
        order.startedAt = now;
        // Decrease stock when execution starts
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

  // Client-accessible endpoint - requires JWT; clients can only view their own orders
  async trackOrder(
    id: string,
    requestingUser: { role: string; clientId: string | null },
  ) {
    const order = await this.findOne(id);

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
