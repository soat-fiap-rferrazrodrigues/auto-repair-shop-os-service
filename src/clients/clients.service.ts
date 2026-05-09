import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientsRepository } from './repositories/clients.repository';

@Injectable()
export class ClientsService {
  constructor(private readonly clientsRepository: ClientsRepository) {}

  async create(dto: CreateClientDto): Promise<Client> {
    const existing = await this.clientsRepository.findByCpfCnpj(dto.cpfCnpj);
    if (existing) throw new ConflictException('CPF/CNPJ already registered');

    const client = this.clientsRepository.create(dto);
    return this.clientsRepository.save(client);
  }

  findAll(): Promise<Client[]> {
    return this.clientsRepository.findAll();
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientsRepository.findById(id);
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async findByCpfCnpj(cpfCnpj: string): Promise<Client> {
    const client = await this.clientsRepository.findByCpfCnpj(cpfCnpj);
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    Object.assign(client, dto);
    return this.clientsRepository.save(client);
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    await this.clientsRepository.remove(client);
  }
}
