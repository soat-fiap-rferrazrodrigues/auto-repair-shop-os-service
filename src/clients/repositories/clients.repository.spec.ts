/* eslint-disable @typescript-eslint/unbound-method */
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ClientsRepository } from './clients.repository';
import { Client } from '../entities/client.entity';

describe('ClientsRepository', () => {
  let clientsRepository: ClientsRepository;
  let repo: jest.Mocked<Repository<Client>>;

  const mockClient = { id: 'client-1', cpfCnpj: '12345678909' } as Client;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsRepository,
        {
          provide: getRepositoryToken(Client),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    clientsRepository = module.get(ClientsRepository);
    repo = module.get(getRepositoryToken(Client));
  });

  it('should be defined', () => {
    expect(clientsRepository).toBeDefined();
  });

  describe('create', () => {
    it('should create a client entity', () => {
      repo.create.mockReturnValue(mockClient);
      const result = clientsRepository.create({ cpfCnpj: '12345678909' });
      expect(repo.create).toHaveBeenCalledWith({ cpfCnpj: '12345678909' });
      expect(result).toEqual(mockClient);
    });
  });

  describe('save', () => {
    it('should save and return a client', async () => {
      repo.save.mockResolvedValue(mockClient);
      const result = await clientsRepository.save(mockClient);
      expect(repo.save).toHaveBeenCalledWith(mockClient);
      expect(result).toEqual(mockClient);
    });
  });

  describe('findAll', () => {
    it('should return all clients with vehicles relation', async () => {
      repo.find.mockResolvedValue([mockClient]);
      const result = await clientsRepository.findAll();
      expect(repo.find).toHaveBeenCalledWith({ relations: ['vehicles'] });
      expect(result).toEqual([mockClient]);
    });
  });

  describe('findById', () => {
    it('should return a client when found', async () => {
      repo.findOne.mockResolvedValue(mockClient);
      const result = await clientsRepository.findById('client-1');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        relations: ['vehicles'],
      });
      expect(result).toEqual(mockClient);
    });

    it('should return null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await clientsRepository.findById('invalid')).toBeNull();
    });
  });

  describe('findByCpfCnpj', () => {
    it('should return a client when found', async () => {
      repo.findOne.mockResolvedValue(mockClient);
      const result = await clientsRepository.findByCpfCnpj('12345678909');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { cpfCnpj: '12345678909' },
        relations: ['vehicles'],
      });
      expect(result).toEqual(mockClient);
    });

    it('should return null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await clientsRepository.findByCpfCnpj('00000000000')).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove and return the client', async () => {
      repo.remove.mockResolvedValue(mockClient);
      const result = await clientsRepository.remove(mockClient);
      expect(repo.remove).toHaveBeenCalledWith(mockClient);
      expect(result).toEqual(mockClient);
    });
  });
});
