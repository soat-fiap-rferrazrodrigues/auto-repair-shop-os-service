/* eslint-disable @typescript-eslint/unbound-method */
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { RepairServicesRepository } from './repair-services.repository';
import { RepairService } from '../entities/repair-service.entity';

describe('RepairServicesRepository', () => {
  let repairServicesRepository: RepairServicesRepository;
  let repo: jest.Mocked<Repository<RepairService>>;

  const mockService = {
    id: 'svc-1',
    name: 'Oil Change',
    price: 150,
  } as RepairService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairServicesRepository,
        {
          provide: getRepositoryToken(RepairService),
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

    repairServicesRepository = module.get(RepairServicesRepository);
    repo = module.get(getRepositoryToken(RepairService));
  });

  it('should be defined', () => {
    expect(repairServicesRepository).toBeDefined();
  });

  describe('create', () => {
    it('should create a repair service entity', () => {
      repo.create.mockReturnValue(mockService);
      const result = repairServicesRepository.create({ name: 'Oil Change' });
      expect(repo.create).toHaveBeenCalledWith({
        name: 'Oil Change',
      });
      expect(result).toEqual(mockService);
    });
  });

  describe('save', () => {
    it('should save and return a repair service', async () => {
      repo.save.mockResolvedValue(mockService);
      const result = await repairServicesRepository.save(mockService);
      expect(repo.save).toHaveBeenCalledWith(mockService);
      expect(result).toEqual(mockService);
    });
  });

  describe('findAll', () => {
    it('should return all repair services', async () => {
      repo.find.mockResolvedValue([mockService]);
      const result = await repairServicesRepository.findAll();
      expect(repo.find).toHaveBeenCalled();
      expect(result).toEqual([mockService]);
    });
  });

  describe('findById', () => {
    it('should return a service when found', async () => {
      repo.findOne.mockResolvedValue(mockService);
      const result = await repairServicesRepository.findById('svc-1');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'svc-1' },
      });
      expect(result).toEqual(mockService);
    });

    it('should return null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await repairServicesRepository.findById('invalid')).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove and return the repair service', async () => {
      repo.remove.mockResolvedValue(mockService);
      const result = await repairServicesRepository.remove(mockService);
      expect(repo.remove).toHaveBeenCalledWith(mockService);
      expect(result).toEqual(mockService);
    });
  });
});
