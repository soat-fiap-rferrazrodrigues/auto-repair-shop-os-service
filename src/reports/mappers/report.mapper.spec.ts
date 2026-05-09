import { ReportMapper, AverageTimeRaw } from './report.mapper';

describe('ReportMapper', () => {
  describe('toAverageTime', () => {
    it('should parse raw data into an average time response', () => {
      const raw: AverageTimeRaw = { avgMinutes: '45.678', totalFinished: '10' };
      const result = ReportMapper.toAverageTime(raw);
      expect(result).toEqual({
        averageExecutionMinutes: 45.68,
        totalFinishedOrders: 10,
      });
    });

    it('should return zeros when raw is undefined', () => {
      const result = ReportMapper.toAverageTime(undefined);
      expect(result).toEqual({
        averageExecutionMinutes: 0,
        totalFinishedOrders: 0,
      });
    });

    it('should return zero averageExecutionMinutes when avgMinutes is null', () => {
      const raw: AverageTimeRaw = { avgMinutes: null, totalFinished: '5' };
      const result = ReportMapper.toAverageTime(raw);
      expect(result.averageExecutionMinutes).toBe(0);
      expect(result.totalFinishedOrders).toBe(5);
    });
  });

  describe('toDashboard', () => {
    it('should merge average time and orders by status into a dashboard', () => {
      const avgTime = { averageExecutionMinutes: 60, totalFinishedOrders: 3 };
      const ordersByStatus = [{ status: 'RECEIVED', count: '2' }];
      const result = ReportMapper.toDashboard(avgTime, ordersByStatus);
      expect(result).toEqual({
        averageExecutionMinutes: 60,
        totalFinishedOrders: 3,
        ordersByStatus,
      });
    });
  });
});
