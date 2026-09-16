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
import { Client } from '../../clients/entities/client.entity';
import { ServiceOrder } from '../../orders/entities/service-order.entity';

// Vehicles are almost always fetched through their owner.
@Index('IDX_vehicles_client', ['clientId'])
@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  plate: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @ManyToOne(() => Client, (client) => client.vehicles, { onDelete: 'CASCADE' })
  client: Client;

  @Column()
  clientId: string;

  @OneToMany(() => ServiceOrder, (order) => order.vehicle)
  orders: ServiceOrder[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
