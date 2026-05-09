import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  let controller: ReportsController;

  const mockReportsService = {
    getAverageExecutionTime: jest.fn(),
    getOrdersByStatus: jest.fn(),
    getDashboard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: mockReportsService }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    jest.clearAllMocks();
  });

  describe('getAverageTime', () => {
    it('should return average execution time report', async () => {
      const report = { averageMinutes: 120 };
      mockReportsService.getAverageExecutionTime.mockResolvedValue(report);
      const result = await controller.getAverageTime();
      expect(mockReportsService.getAverageExecutionTime).toHaveBeenCalled();
      expect(result).toEqual(report);
    });
  });

  describe('getOrdersByStatus', () => {
    it('should return orders grouped by status', async () => {
      const report = [{ status: 'RECEIVED', count: 5 }];
      mockReportsService.getOrdersByStatus.mockResolvedValue(report);
      const result = await controller.getOrdersByStatus();
      expect(mockReportsService.getOrdersByStatus).toHaveBeenCalled();
      expect(result).toEqual(report);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard metrics', async () => {
      const dashboard = { averageMinutes: 120, ordersByStatus: [] };
      mockReportsService.getDashboard.mockResolvedValue(dashboard);
      const result = await controller.getDashboard();
      expect(mockReportsService.getDashboard).toHaveBeenCalled();
      expect(result).toEqual(dashboard);
    });
  });
});
