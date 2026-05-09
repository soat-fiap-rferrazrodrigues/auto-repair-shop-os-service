import { Test, TestingModule } from '@nestjs/testing';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { RepairService } from './entities/repair-service.entity';

describe('ServicesController', () => {
  let controller: ServicesController;

  const mockRepairService: Partial<RepairService> = {
    id: 'svc-1',
    name: 'Oil Change',
    price: 150.0,
    estimatedMinutes: 60,
  };

  const mockServicesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [{ provide: ServicesService, useValue: mockServicesService }],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a repair service', async () => {
      mockServicesService.create.mockResolvedValue(mockRepairService);
      const result = await controller.create({
        name: 'Oil Change',
        price: 150.0,
      });
      expect(mockServicesService.create).toHaveBeenCalled();
      expect(result).toEqual(mockRepairService);
    });
  });

  describe('findAll', () => {
    it('should return all repair services', async () => {
      mockServicesService.findAll.mockResolvedValue([mockRepairService]);
      const result = await controller.findAll();
      expect(result).toEqual([mockRepairService]);
    });
  });

  describe('findOne', () => {
    it('should return a repair service by id', async () => {
      mockServicesService.findOne.mockResolvedValue(mockRepairService);
      const result = await controller.findOne('svc-1');
      expect(mockServicesService.findOne).toHaveBeenCalledWith('svc-1');
      expect(result).toEqual(mockRepairService);
    });
  });

  describe('update', () => {
    it('should update a repair service', async () => {
      const updated = { ...mockRepairService, price: 200.0 };
      mockServicesService.update.mockResolvedValue(updated);
      const result = await controller.update('svc-1', { price: 200.0 });
      expect(mockServicesService.update).toHaveBeenCalledWith('svc-1', {
        price: 200.0,
      });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should remove a repair service', async () => {
      mockServicesService.remove.mockResolvedValue(undefined);
      await expect(controller.remove('svc-1')).resolves.toBeUndefined();
      expect(mockServicesService.remove).toHaveBeenCalledWith('svc-1');
    });
  });
});
