/* eslint-disable @typescript-eslint/unbound-method */
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { PartsRepository } from './parts.repository';
import { Part } from '../entities/part.entity';

describe('PartsRepository', () => {
  let partsRepository: PartsRepository;
  let repo: jest.Mocked<Repository<Part>>;

  const mockPart = {
    id: 'part-1',
    name: 'Oil Filter',
    stockQuantity: 10,
  } as Part;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartsRepository,
        {
          provide: getRepositoryToken(Part),
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

    partsRepository = module.get(PartsRepository);
    repo = module.get(getRepositoryToken(Part));
  });

  it('should be defined', () => {
    expect(partsRepository).toBeDefined();
  });

  describe('create', () => {
    it('should create a part entity', () => {
      repo.create.mockReturnValue(mockPart);
      const result = partsRepository.create({ name: 'Oil Filter' });
      expect(repo.create).toHaveBeenCalledWith({ name: 'Oil Filter' });
      expect(result).toEqual(mockPart);
    });
  });

  describe('save', () => {
    it('should save and return a part', async () => {
      repo.save.mockResolvedValue(mockPart);
      const result = await partsRepository.save(mockPart);
      expect(repo.save).toHaveBeenCalledWith(mockPart);
      expect(result).toEqual(mockPart);
    });
  });

  describe('findAll', () => {
    it('should return all parts', async () => {
      repo.find.mockResolvedValue([mockPart]);
      const result = await partsRepository.findAll();
      expect(repo.find).toHaveBeenCalled();
      expect(result).toEqual([mockPart]);
    });
  });

  describe('findById', () => {
    it('should return a part when found', async () => {
      repo.findOne.mockResolvedValue(mockPart);
      const result = await partsRepository.findById('part-1');
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'part-1' } });
      expect(result).toEqual(mockPart);
    });

    it('should return null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await partsRepository.findById('invalid')).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove and return the part', async () => {
      repo.remove.mockResolvedValue(mockPart);
      const result = await partsRepository.remove(mockPart);
      expect(repo.remove).toHaveBeenCalledWith(mockPart);
      expect(result).toEqual(mockPart);
    });
  });
});
