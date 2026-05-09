import { Test, TestingModule } from '@nestjs/testing';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';
import { Part } from './entities/part.entity';

describe('PartsController', () => {
  let controller: PartsController;

  const mockPart: Partial<Part> = {
    id: 'part-1',
    name: 'Oil Filter',
    unitPrice: 45.9,
    stockQuantity: 10,
  };

  const mockPartsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartsController],
      providers: [{ provide: PartsService, useValue: mockPartsService }],
    }).compile();

    controller = module.get<PartsController>(PartsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a part', async () => {
      mockPartsService.create.mockResolvedValue(mockPart);
      const result = await controller.create({
        name: 'Oil Filter',
        unitPrice: 45.9,
        stockQuantity: 10,
      });
      expect(mockPartsService.create).toHaveBeenCalled();
      expect(result).toEqual(mockPart);
    });
  });

  describe('findAll', () => {
    it('should return all parts', async () => {
      mockPartsService.findAll.mockResolvedValue([mockPart]);
      const result = await controller.findAll();
      expect(result).toEqual([mockPart]);
    });
  });

  describe('findOne', () => {
    it('should return a part by id', async () => {
      mockPartsService.findOne.mockResolvedValue(mockPart);
      const result = await controller.findOne('part-1');
      expect(mockPartsService.findOne).toHaveBeenCalledWith('part-1');
      expect(result).toEqual(mockPart);
    });
  });

  describe('update', () => {
    it('should update a part', async () => {
      const updated = { ...mockPart, unitPrice: 55.9 };
      mockPartsService.update.mockResolvedValue(updated);
      const result = await controller.update('part-1', {
        unitPrice: 55.9,
      });
      expect(mockPartsService.update).toHaveBeenCalledWith('part-1', {
        unitPrice: 55.9,
      });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should remove a part', async () => {
      mockPartsService.remove.mockResolvedValue(undefined);
      await expect(controller.remove('part-1')).resolves.toBeUndefined();
      expect(mockPartsService.remove).toHaveBeenCalledWith('part-1');
    });
  });
});
