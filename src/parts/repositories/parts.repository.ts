import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Part } from '../entities/part.entity';

@Injectable()
export class PartsRepository {
  constructor(
    @InjectRepository(Part)
    private readonly repo: Repository<Part>,
  ) {}

  create(data: Partial<Part>): Part {
    return this.repo.create(data);
  }

  save(part: Partial<Part>): Promise<Part> {
    return this.repo.save(part);
  }

  findAll(): Promise<Part[]> {
    return this.repo.find();
  }

  findById(id: string): Promise<Part | null> {
    return this.repo.findOne({ where: { id } });
  }

  remove(part: Part): Promise<Part> {
    return this.repo.remove(part);
  }
}
