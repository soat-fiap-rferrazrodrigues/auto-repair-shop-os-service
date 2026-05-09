import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../entities/vehicle.entity';

@Injectable()
export class VehiclesRepository {
  constructor(
    @InjectRepository(Vehicle)
    private readonly repo: Repository<Vehicle>,
  ) {}

  create(data: Partial<Vehicle>): Vehicle {
    return this.repo.create(data);
  }

  save(vehicle: Partial<Vehicle>): Promise<Vehicle> {
    return this.repo.save(vehicle);
  }

  findAll(): Promise<Vehicle[]> {
    return this.repo.find({ relations: ['client'] });
  }

  findById(id: string): Promise<Vehicle | null> {
    return this.repo.findOne({ where: { id }, relations: ['client'] });
  }

  remove(vehicle: Vehicle): Promise<Vehicle> {
    return this.repo.remove(vehicle);
  }
}
