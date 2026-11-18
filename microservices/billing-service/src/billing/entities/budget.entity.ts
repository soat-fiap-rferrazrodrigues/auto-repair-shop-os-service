import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface BudgetItem {
  kind: 'SERVICE' | 'PART';
  referenceId: string;
  quantity: number;
  unitPrice: number;
}

/** One budget per service order; regenerated (overwritten) after a rejection. */
@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  orderId: string;

  @Column({ type: 'jsonb' })
  items: BudgetItem[];

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
