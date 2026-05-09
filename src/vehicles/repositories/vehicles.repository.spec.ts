/* eslint-disable @typescript-eslint/unbound-method */
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { VehiclesRepository } from './vehicles.repository';
import { Vehicle } from '../entities/vehicle.entity';

describe('VehiclesRepository', () => {
  let vehiclesRepository: VehiclesRepository;
  let repo: jest.Mocked<Repository<Vehicle>>;

  const mockVehicle = { id: 'vehicle-1', plate: 'ABC1D23' } as Vehicle;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesRepository,
        {
          provide: getRepositoryToken(Vehicle),
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

    vehiclesRepository = module.get(VehiclesRepository);
    repo = module.get(getRepositoryToken(Vehicle));
  });

  it('should be defined', () => {
    expect(vehiclesRepository).toBeDefined();
  });

  describe('create', () => {
    it('should create a vehicle entity', () => {
      repo.create.mockReturnValue(mockVehicle);
      const result = vehiclesRepository.create({ plate: 'ABC1D23' });
      expect(repo.create).toHaveBeenCalledWith({ plate: 'ABC1D23' });
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('save', () => {
    it('should save and return a vehicle', async () => {
      repo.save.mockResolvedValue(mockVehicle);
      const result = await vehiclesRepository.save(mockVehicle);
      expect(repo.save).toHaveBeenCalledWith(mockVehicle);
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('findAll', () => {
    it('should return all vehicles with client relation', async () => {
      repo.find.mockResolvedValue([mockVehicle]);
      const result = await vehiclesRepository.findAll();
      expect(repo.find).toHaveBeenCalledWith({ relations: ['client'] });
      expect(result).toEqual([mockVehicle]);
    });
  });

  describe('findById', () => {
    it('should return a vehicle when found', async () => {
      repo.findOne.mockResolvedValue(mockVehicle);
      const result = await vehiclesRepository.findById('vehicle-1');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'vehicle-1' },
        relations: ['client'],
      });
      expect(result).toEqual(mockVehicle);
    });

    it('should return null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await vehiclesRepository.findById('invalid')).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove and return the vehicle', async () => {
      repo.remove.mockResolvedValue(mockVehicle);
      const result = await vehiclesRepository.remove(mockVehicle);
      expect(repo.remove).toHaveBeenCalledWith(mockVehicle);
      expect(result).toEqual(mockVehicle);
    });
  });
});
