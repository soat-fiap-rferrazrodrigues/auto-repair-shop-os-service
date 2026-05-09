import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from './entities/vehicle.entity';

describe('VehiclesController', () => {
  let controller: VehiclesController;

  const mockVehicle: Partial<Vehicle> = {
    id: 'vehicle-1',
    plate: 'ABC1D23',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    clientId: 'client-1',
  };

  const mockVehiclesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [{ provide: VehiclesService, useValue: mockVehiclesService }],
    }).compile();

    controller = module.get<VehiclesController>(VehiclesController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a vehicle', async () => {
      mockVehiclesService.create.mockResolvedValue(mockVehicle);
      const result = await controller.create({
        plate: 'ABC1D23',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        clientId: 'client-1',
      });
      expect(mockVehiclesService.create).toHaveBeenCalled();
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('findAll', () => {
    it('should return all vehicles', async () => {
      mockVehiclesService.findAll.mockResolvedValue([mockVehicle]);
      const result = await controller.findAll();
      expect(result).toEqual([mockVehicle]);
    });
  });

  describe('findOne', () => {
    it('should return a vehicle by id', async () => {
      mockVehiclesService.findOne.mockResolvedValue(mockVehicle);
      const result = await controller.findOne('vehicle-1');
      expect(mockVehiclesService.findOne).toHaveBeenCalledWith('vehicle-1');
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('update', () => {
    it('should update a vehicle', async () => {
      const updated = { ...mockVehicle, model: 'Camry' };
      mockVehiclesService.update.mockResolvedValue(updated);
      const result = await controller.update('vehicle-1', { model: 'Camry' });
      expect(mockVehiclesService.update).toHaveBeenCalledWith('vehicle-1', {
        model: 'Camry',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should remove a vehicle', async () => {
      mockVehiclesService.remove.mockResolvedValue(undefined);
      await expect(controller.remove('vehicle-1')).resolves.toBeUndefined();
      expect(mockVehiclesService.remove).toHaveBeenCalledWith('vehicle-1');
    });
  });
});
