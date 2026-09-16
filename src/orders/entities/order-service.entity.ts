import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { ServiceOrder } from './service-order.entity';
import { RepairService } from '../../services/entities/repair-service.entity';

// Items are always loaded by their parent order.
@Index('IDX_order_services_order', ['orderId'])
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
