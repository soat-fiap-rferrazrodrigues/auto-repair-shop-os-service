import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { RepairServicesRepository } from './repositories/repair-services.repository';
import { RepairService } from './entities/repair-service.entity';

describe('ServicesService', () => {
  let service: ServicesService;

  const mockRepairService: Partial<RepairService> = {
    id: 'svc-1',
    name: 'Oil Change',
    description: 'Full oil change service',
    price: 150.0,
    estimatedMinutes: 60,
  };

  const mockServicesRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: RepairServicesRepository, useValue: mockServicesRepository },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a repair service', async () => {
      mockServicesRepository.create.mockReturnValue(mockRepairService);
      mockServicesRepository.save.mockResolvedValue(mockRepairService);

      const result = await service.create({
        name: 'Oil Change',
        price: 150.0,
      });

      expect(result).toEqual(mockRepairService);
      expect(mockServicesRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all repair services', async () => {
      mockServicesRepository.findAll.mockResolvedValue([mockRepairService]);
      const result = await service.findAll();
      expect(result).toEqual([mockRepairService]);
    });

    it('should return empty array when no services exist', async () => {
      mockServicesRepository.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a repair service by id', async () => {
      mockServicesRepository.findById.mockResolvedValue(mockRepairService);
      const result = await service.findOne('svc-1');
      expect(result).toEqual(mockRepairService);
    });

    it('should throw NotFoundException when service not found', async () => {
      mockServicesRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a repair service', async () => {
      mockServicesRepository.findById.mockResolvedValue({
        ...mockRepairService,
      });
      mockServicesRepository.save.mockImplementation((s) => Promise.resolve(s));

      const result = await service.update('svc-1', { price: 200.0 });
      expect(result.price).toBe(200.0);
      expect(mockServicesRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent service', async () => {
      mockServicesRepository.findById.mockResolvedValue(null);
      await expect(
        service.update('invalid-id', { price: 200 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a repair service', async () => {
      mockServicesRepository.findById.mockResolvedValue(mockRepairService);
      mockServicesRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove('svc-1')).resolves.toBeUndefined();
      expect(mockServicesRepository.remove).toHaveBeenCalledWith(
        mockRepairService,
      );
    });

    it('should throw NotFoundException when removing non-existent service', async () => {
      mockServicesRepository.findById.mockResolvedValue(null);
      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
