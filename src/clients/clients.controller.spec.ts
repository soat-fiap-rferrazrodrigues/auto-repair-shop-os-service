import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client } from './entities/client.entity';

describe('ClientsController', () => {
  let controller: ClientsController;

  const mockClient: Partial<Client> = {
    id: 'client-1',
    name: 'John Doe',
    cpfCnpj: '12345678909',
    email: 'john@test.com',
  };

  const mockClientsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCpfCnpj: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [{ provide: ClientsService, useValue: mockClientsService }],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a client', async () => {
      mockClientsService.create.mockResolvedValue(mockClient);
      const result = await controller.create({
        name: 'John Doe',
        cpfCnpj: '12345678909',
      });
      expect(mockClientsService.create).toHaveBeenCalled();
      expect(result).toEqual(mockClient);
    });
  });

  describe('findAll', () => {
    it('should return all clients', async () => {
      mockClientsService.findAll.mockResolvedValue([mockClient]);
      const result = await controller.findAll();
      expect(result).toEqual([mockClient]);
    });
  });

  describe('findByCpfCnpj', () => {
    it('should return a client by CPF/CNPJ', async () => {
      mockClientsService.findByCpfCnpj.mockResolvedValue(mockClient);
      const result = await controller.findByCpfCnpj('12345678909');
      expect(mockClientsService.findByCpfCnpj).toHaveBeenCalledWith(
        '12345678909',
      );
      expect(result).toEqual(mockClient);
    });
  });

  describe('findOne', () => {
    it('should return a client by id', async () => {
      mockClientsService.findOne.mockResolvedValue(mockClient);
      const result = await controller.findOne('client-1');
      expect(mockClientsService.findOne).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(mockClient);
    });
  });

  describe('update', () => {
    it('should update a client', async () => {
      const updated = { ...mockClient, name: 'Jane Doe' };
      mockClientsService.update.mockResolvedValue(updated);
      const result = await controller.update('client-1', {
        name: 'Jane Doe',
      });
      expect(mockClientsService.update).toHaveBeenCalledWith('client-1', {
        name: 'Jane Doe',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should remove a client', async () => {
      mockClientsService.remove.mockResolvedValue(undefined);
      await expect(controller.remove('client-1')).resolves.toBeUndefined();
      expect(mockClientsService.remove).toHaveBeenCalledWith('client-1');
    });
  });
});
