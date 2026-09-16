import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderServiceItem } from './order-service.entity';
import { OrderPart } from './order-part.entity';

// Supports the dashboard queries that filter by status and order by creation
// date (daily volume and average execution time per status).
@Index('IDX_service_orders_status_created', ['status', 'createdAt'])
@Entity('service_orders')
export class ServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.orders, { eager: true })
  vehicle: Vehicle;

  @Column()
  vehicleId: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.RECEIVED })
  status: OrderStatus;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalPrice: number;

  @OneToMany(() => OrderServiceItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  services: OrderServiceItem[];

  @OneToMany(() => OrderPart, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  parts: OrderPart[];

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  finishedAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
