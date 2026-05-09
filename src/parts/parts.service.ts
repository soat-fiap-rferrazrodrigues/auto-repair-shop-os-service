import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Part } from './entities/part.entity';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { PartsRepository } from './repositories/parts.repository';

@Injectable()
export class PartsService {
  constructor(private readonly partsRepository: PartsRepository) {}

  create(dto: CreatePartDto): Promise<Part> {
    const part = this.partsRepository.create(dto);
    return this.partsRepository.save(part);
  }

  findAll(): Promise<Part[]> {
    return this.partsRepository.findAll();
  }

  async findOne(id: string): Promise<Part> {
    const part = await this.partsRepository.findById(id);
    if (!part) throw new NotFoundException('Part not found');
    return part;
  }

  async update(id: string, dto: UpdatePartDto): Promise<Part> {
    const part = await this.findOne(id);
    Object.assign(part, dto);
    return this.partsRepository.save(part);
  }

  async remove(id: string): Promise<void> {
    const part = await this.findOne(id);
    await this.partsRepository.remove(part);
  }

  async decreaseStock(id: string, quantity: number): Promise<Part> {
    const part = await this.findOne(id);
    if (part.stockQuantity < quantity) {
      throw new BadRequestException(
        `Insufficient stock for "${part.name}". Available: ${part.stockQuantity}, Requested: ${quantity}`,
      );
    }
    part.stockQuantity -= quantity;
    return this.partsRepository.save(part);
  }

  async increaseStock(id: string, quantity: number): Promise<Part> {
    const part = await this.findOne(id);
    part.stockQuantity += quantity;
    return this.partsRepository.save(part);
  }
}
