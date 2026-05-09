/* eslint-disable @typescript-eslint/unbound-method */
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { SelectQueryBuilder } from 'typeorm';
import { OrdersRepository } from './orders.repository';
import { ServiceOrder } from '../entities/service-order.entity';
import { OrderStatus } from '../enums/order-status.enum';

const ORDER_RELATIONS = [
  'vehicle',
  'vehicle.client',
  'services',
  'services.service',
  'parts',
  'parts.part',
];

describe('OrdersRepository', () => {
  let ordersRepository: OrdersRepository;

  const mockOrder = {
    id: 'order-1',
    status: OrderStatus.RECEIVED,
  } as ServiceOrder;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  } as unknown as jest.Mocked<SelectQueryBuilder<ServiceOrder>>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersRepository,
        { provide: getRepositoryToken(ServiceOrder), useValue: mockRepo },
      ],
    }).compile();

    ordersRepository = module.get(OrdersRepository);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(ordersRepository).toBeDefined();
  });

  describe('create', () => {
    it('should create an order entity', () => {
      mockRepo.create.mockReturnValue(mockOrder);
      const result = ordersRepository.create({ status: OrderStatus.RECEIVED });
      expect(mockRepo.create).toHaveBeenCalledWith({
        status: OrderStatus.RECEIVED,
      });
      expect(result).toEqual(mockOrder);
    });
  });

  describe('save', () => {
    it('should save and return an order', async () => {
      mockRepo.save.mockResolvedValue(mockOrder);
      const result = await ordersRepository.save(mockOrder);
      expect(mockRepo.save).toHaveBeenCalledWith(mockOrder);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('findAll', () => {
    it('should return all orders with full relations', async () => {
      mockRepo.find.mockResolvedValue([mockOrder]);
      const result = await ordersRepository.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({
        relations: ORDER_RELATIONS,
      });
      expect(result).toEqual([mockOrder]);
    });
  });

  describe('findById', () => {
    it('should return an order when found', async () => {
      mockRepo.findOne.mockResolvedValue(mockOrder);
      const result = await ordersRepository.findById('order-1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        relations: ORDER_RELATIONS,
      });
      expect(result).toEqual(mockOrder);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      expect(await ordersRepository.findById('invalid')).toBeNull();
    });
  });

  describe('getAverageExecutionTime', () => {
    it('should return average time raw result', async () => {
      const raw = { avgMinutes: '45.5', totalFinished: '10' };
      mockQueryBuilder.getRawOne.mockResolvedValue(raw);

      const result = await ordersRepository.getAverageExecutionTime();
      expect(result).toEqual(raw);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'order.status IN (:...statuses)',
        { statuses: [OrderStatus.FINISHED, OrderStatus.DELIVERED] },
      );
    });

    it('should return undefined when no finished orders exist', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue(undefined);
      const result = await ordersRepository.getAverageExecutionTime();
      expect(result).toBeUndefined();
    });
  });

  describe('getOrdersByStatus', () => {
    it('should return orders grouped by status', async () => {
      const raw = [{ status: 'RECEIVED', count: '3' }];
      mockQueryBuilder.getRawMany.mockResolvedValue(raw);

      const result = await ordersRepository.getOrdersByStatus();
      expect(result).toEqual(raw);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('order.status');
    });
  });
});
