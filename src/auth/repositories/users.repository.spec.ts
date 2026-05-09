/* eslint-disable @typescript-eslint/unbound-method */
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { UsersRepository } from './users.repository';
import { User } from '../entities/user.entity';

describe('UsersRepository', () => {
  let usersRepository: UsersRepository;
  let repo: jest.Mocked<Repository<User>>;

  const mockUser = { id: 'user-1', email: 'admin@test.com' } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    usersRepository = module.get(UsersRepository);
    repo = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(usersRepository).toBeDefined();
  });

  describe('create', () => {
    it('should create a user entity', () => {
      repo.create.mockReturnValue(mockUser);
      const result = usersRepository.create({ email: 'admin@test.com' });
      expect(repo.create).toHaveBeenCalledWith({ email: 'admin@test.com' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('save', () => {
    it('should save and return a user', async () => {
      repo.save.mockResolvedValue(mockUser);
      const result = await usersRepository.save(mockUser);
      expect(repo.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      repo.findOne.mockResolvedValue(mockUser);
      const result = await usersRepository.findByEmail('admin@test.com');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@test.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await usersRepository.findByEmail('notfound@test.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      repo.findOne.mockResolvedValue(mockUser);
      const result = await usersRepository.findById('user-1');
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result).toEqual(mockUser);
    });

    it('should return null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await usersRepository.findById('invalid');
      expect(result).toBeNull();
    });
  });
});
