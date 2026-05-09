import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';

@Injectable()
export class ClientsRepository {
  constructor(
    @InjectRepository(Client)
    private readonly repo: Repository<Client>,
  ) {}

  create(data: Partial<Client>): Client {
    return this.repo.create(data);
  }

  save(client: Partial<Client>): Promise<Client> {
    return this.repo.save(client);
  }

  findAll(): Promise<Client[]> {
    return this.repo.find({ relations: ['vehicles'] });
  }

  findById(id: string): Promise<Client | null> {
    return this.repo.findOne({ where: { id }, relations: ['vehicles'] });
  }

  findByCpfCnpj(cpfCnpj: string): Promise<Client | null> {
    return this.repo.findOne({ where: { cpfCnpj }, relations: ['vehicles'] });
  }

  remove(client: Client): Promise<Client> {
    return this.repo.remove(client);
  }
}
