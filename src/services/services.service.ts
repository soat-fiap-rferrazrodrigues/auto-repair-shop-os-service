import { Injectable, NotFoundException } from '@nestjs/common';
import { RepairService } from './entities/repair-service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { RepairServicesRepository } from './repositories/repair-services.repository';

@Injectable()
export class ServicesService {
  constructor(private readonly servicesRepository: RepairServicesRepository) {}

  create(dto: CreateServiceDto): Promise<RepairService> {
    const service = this.servicesRepository.create(dto);
    return this.servicesRepository.save(service);
  }

  findAll(): Promise<RepairService[]> {
    return this.servicesRepository.findAll();
  }

  async findOne(id: string): Promise<RepairService> {
    const service = await this.servicesRepository.findById(id);
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<RepairService> {
    const service = await this.findOne(id);
    Object.assign(service, dto);
    return this.servicesRepository.save(service);
  }

  async remove(id: string): Promise<void> {
    const service = await this.findOne(id);
    await this.servicesRepository.remove(service);
  }
}
