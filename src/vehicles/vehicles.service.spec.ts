import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesRepository } from './repositories/vehicles.repository';
import { Vehicle } from './entities/vehicle.entity';

describe('VehiclesService', () => {
  let service: VehiclesService;

  const mockVehicle: Partial<Vehicle> = {
    id: 'vehicle-1',
    plate: 'ABC1D23',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    clientId: 'client-1',
  };

  const mockVehiclesRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: VehiclesRepository, useValue: mockVehiclesRepository },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a vehicle', async () => {
      mockVehiclesRepository.create.mockReturnValue(mockVehicle);
      mockVehiclesRepository.save.mockResolvedValue(mockVehicle);

      const result = await service.create({
        plate: 'ABC1D23',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        clientId: 'client-1',
      });

      expect(result).toEqual(mockVehicle);
      expect(mockVehiclesRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all vehicles', async () => {
      mockVehiclesRepository.findAll.mockResolvedValue([mockVehicle]);
      const result = await service.findAll();
      expect(result).toEqual([mockVehicle]);
    });

    it('should return empty array when no vehicles exist', async () => {
      mockVehiclesRepository.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a vehicle by id', async () => {
      mockVehiclesRepository.findById.mockResolvedValue(mockVehicle);
      const result = await service.findOne('vehicle-1');
      expect(result).toEqual(mockVehicle);
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      mockVehiclesRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a vehicle', async () => {
      mockVehiclesRepository.findById.mockResolvedValue({ ...mockVehicle });
      mockVehiclesRepository.save.mockImplementation((v) => Promise.resolve(v));

      const result = await service.update('vehicle-1', { model: 'Camry' });
      expect(result.model).toBe('Camry');
      expect(mockVehiclesRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent vehicle', async () => {
      mockVehiclesRepository.findById.mockResolvedValue(null);
      await expect(
        service.update('invalid-id', { model: 'Camry' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a vehicle', async () => {
      mockVehiclesRepository.findById.mockResolvedValue(mockVehicle);
      mockVehiclesRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove('vehicle-1')).resolves.toBeUndefined();
      expect(mockVehiclesRepository.remove).toHaveBeenCalledWith(mockVehicle);
    });

    it('should throw NotFoundException when removing non-existent vehicle', async () => {
      mockVehiclesRepository.findById.mockResolvedValue(null);
      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
