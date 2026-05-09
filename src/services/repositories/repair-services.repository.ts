import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RepairService } from '../entities/repair-service.entity';

@Injectable()
export class RepairServicesRepository {
  constructor(
    @InjectRepository(RepairService)
    private readonly repo: Repository<RepairService>,
  ) {}

  create(data: Partial<RepairService>): RepairService {
    return this.repo.create(data);
  }

  save(service: Partial<RepairService>): Promise<RepairService> {
    return this.repo.save(service);
  }

  findAll(): Promise<RepairService[]> {
    return this.repo.find();
  }

  findById(id: string): Promise<RepairService | null> {
    return this.repo.findOne({ where: { id } });
  }

  remove(service: RepairService): Promise<RepairService> {
    return this.repo.remove(service);
  }
}
