import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ServiceOrder } from './entities/service-order.entity';
import { OrderServiceItem } from './entities/order-service.entity';
import { OrderPart } from './entities/order-part.entity';
import { ServicesModule } from '../services/services.module';
import { PartsModule } from '../parts/parts.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { OrdersRepository } from './repositories/orders.repository';
import {
  CreateOrderUseCase,
  UpdateOrderStatusUseCase,
  ListOrdersUseCase,
  TrackOrderUseCase,
} from './use-cases';
import { OrderSagaOrchestrator } from './saga/order-saga.orchestrator';
import {
  messagePublisherProvider,
  sagaConsumerProvider,
} from './saga/saga.providers';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceOrder, OrderServiceItem, OrderPart]),
    ServicesModule,
    PartsModule,
    VehiclesModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderSagaOrchestrator,
    messagePublisherProvider,
    sagaConsumerProvider,
    OrdersRepository,
    CreateOrderUseCase,
    UpdateOrderStatusUseCase,
    ListOrdersUseCase,
    TrackOrderUseCase,
  ],
  exports: [OrdersService, OrdersRepository, OrderSagaOrchestrator],
})
export class OrdersModule {}
