import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PartsService } from './parts.service';
import { PartsRepository } from './repositories/parts.repository';
import { Part } from './entities/part.entity';

describe('PartsService', () => {
  let service: PartsService;

  const mockPart: Partial<Part> = {
    id: 'part-1',
    name: 'Oil filter',
    description: 'Generic oil filter',
    unitPrice: 45.9,
    stockQuantity: 10,
  };

  const mockPartsRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartsService,
        { provide: PartsRepository, useValue: mockPartsRepository },
      ],
    }).compile();

    service = module.get<PartsService>(PartsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a part', async () => {
      mockPartsRepository.create.mockReturnValue(mockPart);
      mockPartsRepository.save.mockResolvedValue(mockPart);

      const result = await service.create({
        name: 'Oil filter',
        unitPrice: 45.9,
        stockQuantity: 10,
      });

      expect(result).toEqual(mockPart);
    });
  });

  describe('findAll', () => {
    it('should return all parts', async () => {
      mockPartsRepository.findAll.mockResolvedValue([mockPart]);
      const result = await service.findAll();
      expect(result).toEqual([mockPart]);
    });
  });

  describe('findOne', () => {
    it('should return a part by id', async () => {
      mockPartsRepository.findById.mockResolvedValue(mockPart);
      const result = await service.findOne('part-1');
      expect(result).toEqual(mockPart);
    });

    it('should throw NotFoundException', async () => {
      mockPartsRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('decreaseStock', () => {
    it('should decrease stock', async () => {
      mockPartsRepository.findById.mockResolvedValue({
        ...mockPart,
        stockQuantity: 10,
      });
      mockPartsRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.decreaseStock('part-1', 3);
      expect(result.stockQuantity).toBe(7);
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      mockPartsRepository.findById.mockResolvedValue({
        ...mockPart,
        stockQuantity: 2,
      });

      await expect(service.decreaseStock('part-1', 5)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('increaseStock', () => {
    it('should increase stock', async () => {
      mockPartsRepository.findById.mockResolvedValue({
        ...mockPart,
        stockQuantity: 10,
      });
      mockPartsRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.increaseStock('part-1', 5);
      expect(result.stockQuantity).toBe(15);
    });
  });

  describe('update', () => {
    it('should update a part', async () => {
      mockPartsRepository.findById.mockResolvedValue({ ...mockPart });
      mockPartsRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.update('part-1', { name: 'New filter' });
      expect(result.name).toBe('New filter');
    });
  });

  describe('remove', () => {
    it('should remove a part', async () => {
      mockPartsRepository.findById.mockResolvedValue(mockPart);
      mockPartsRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove('part-1')).resolves.toBeUndefined();
    });
  });
});
