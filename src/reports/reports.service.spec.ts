import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { OrdersRepository } from '../orders/repositories/orders.repository';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockOrdersRepository = {
    getAverageExecutionTime: jest.fn(),
    getOrdersByStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: OrdersRepository,
          useValue: mockOrdersRepository,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  describe('getAverageExecutionTime', () => {
    it('should return parsed average minutes and total', async () => {
      mockOrdersRepository.getAverageExecutionTime.mockResolvedValue({
        avgMinutes: '120.5',
        totalFinished: '10',
      });

      const result = await service.getAverageExecutionTime();

      expect(result).toEqual({
        averageExecutionMinutes: 120.5,
        totalFinishedOrders: 10,
      });
    });

    it('should return 0 when no finished orders exist', async () => {
      mockOrdersRepository.getAverageExecutionTime.mockResolvedValue(undefined);

      const result = await service.getAverageExecutionTime();

      expect(result).toEqual({
        averageExecutionMinutes: 0,
        totalFinishedOrders: 0,
      });
    });

    it('should return 0 avgMinutes when avgMinutes is null', async () => {
      mockOrdersRepository.getAverageExecutionTime.mockResolvedValue({
        avgMinutes: null,
        totalFinished: '3',
      });

      const result = await service.getAverageExecutionTime();

      expect(result.averageExecutionMinutes).toBe(0);
      expect(result.totalFinishedOrders).toBe(3);
    });
  });

  describe('getOrdersByStatus', () => {
    it('should delegate to repository', async () => {
      const mockData = [
        { status: 'RECEIVED', count: '5' },
        { status: 'FINISHED', count: '3' },
      ];
      mockOrdersRepository.getOrdersByStatus.mockResolvedValue(mockData);

      const result = await service.getOrdersByStatus();

      expect(result).toEqual(mockData);
      expect(mockOrdersRepository.getOrdersByStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDashboard', () => {
    it('should combine average time and orders by status', async () => {
      mockOrdersRepository.getAverageExecutionTime.mockResolvedValue({
        avgMinutes: '60',
        totalFinished: '4',
      });
      mockOrdersRepository.getOrdersByStatus.mockResolvedValue([
        { status: 'DELIVERED', count: '4' },
      ]);

      const result = await service.getDashboard();

      expect(result.averageExecutionMinutes).toBe(60);
      expect(result.totalFinishedOrders).toBe(4);
      expect(result.ordersByStatus).toHaveLength(1);
    });
  });
});
