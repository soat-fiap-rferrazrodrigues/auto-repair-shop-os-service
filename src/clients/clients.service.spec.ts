import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsRepository } from './repositories/clients.repository';
import { Client } from './entities/client.entity';

describe('ClientsService', () => {
  let service: ClientsService;

  const mockClient: Partial<Client> = {
    id: 'client-1',
    name: 'John Doe',
    cpfCnpj: '12345678909',
    email: 'john@email.com',
  };

  const mockClientsRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCpfCnpj: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: ClientsRepository, useValue: mockClientsRepository },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a client', async () => {
      mockClientsRepository.findByCpfCnpj.mockResolvedValue(null);
      mockClientsRepository.create.mockReturnValue(mockClient);
      mockClientsRepository.save.mockResolvedValue(mockClient);

      const result = await service.create({
        name: 'John Doe',
        cpfCnpj: '12345678909',
      });

      expect(result).toEqual(mockClient);
    });

    it('should throw ConflictException for duplicate CPF/CNPJ', async () => {
      mockClientsRepository.findByCpfCnpj.mockResolvedValue(mockClient);

      await expect(
        service.create({ name: 'John', cpfCnpj: '12345678909' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all clients', async () => {
      mockClientsRepository.findAll.mockResolvedValue([mockClient]);
      expect(await service.findAll()).toEqual([mockClient]);
    });
  });

  describe('findOne', () => {
    it('should return a client', async () => {
      mockClientsRepository.findById.mockResolvedValue(mockClient);
      expect(await service.findOne('client-1')).toEqual(mockClient);
    });

    it('should throw NotFoundException', async () => {
      mockClientsRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a client', async () => {
      mockClientsRepository.findById.mockResolvedValue({ ...mockClient });
      mockClientsRepository.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.update('client-1', { name: 'Jane' });
      expect(result.name).toBe('Jane');
    });
  });

  describe('remove', () => {
    it('should remove a client', async () => {
      mockClientsRepository.findById.mockResolvedValue(mockClient);
      mockClientsRepository.remove.mockResolvedValue(undefined);
      await expect(service.remove('client-1')).resolves.toBeUndefined();
    });
  });
});
