import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ServiceOrder } from './service-order.entity';
import { Part } from '../../parts/entities/part.entity';

@Entity('order_parts')
export class OrderPart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ServiceOrder, (order) => order.parts, {
    onDelete: 'CASCADE',
  })
  order: ServiceOrder;

  @Column()
  orderId: string;

  @ManyToOne(() => Part, { eager: true })
  part: Part;

  @Column()
  partId: string;

  @Column()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;
}
