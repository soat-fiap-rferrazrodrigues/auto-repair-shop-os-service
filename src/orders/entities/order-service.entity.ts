import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ServiceOrder } from './service-order.entity';
import { RepairService } from '../../services/entities/repair-service.entity';

@Entity('order_services')
export class OrderServiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ServiceOrder, (order) => order.services, {
    onDelete: 'CASCADE',
  })
  order: ServiceOrder;

  @Column()
  orderId: string;

  @ManyToOne(() => RepairService, { eager: true })
  service: RepairService;

  @Column()
  serviceId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;
}
