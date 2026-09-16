import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

describe('Health', () => {
  let service: HealthService;
  let controller: HealthController;
  const mockDataSource = { query: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  describe('liveness', () => {
    it('should report the process as alive', () => {
      const result = service.getLiveness();

      expect(result.status).toBe('ok');
      expect(typeof result.uptimeSeconds).toBe('number');
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should be exposed through the controller', () => {
      expect(controller.checkLiveness().status).toBe('ok');
    });
  });

  describe('readiness', () => {
    it('should report ready when the database answers', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.getReadiness();

      expect(result).toEqual(
        expect.objectContaining({ status: 'ok', database: 'up' }),
      );
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should fail readiness when the database is unreachable', async () => {
      mockDataSource.query.mockRejectedValue(new Error('connection refused'));

      await expect(service.getReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should be exposed through the controller', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      await expect(controller.checkReadiness()).resolves.toEqual(
        expect.objectContaining({ status: 'ok' }),
      );
    });
  });
});
