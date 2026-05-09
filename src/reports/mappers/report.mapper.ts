export interface AverageTimeRaw {
  avgMinutes: string | null;
  totalFinished: string;
}

export interface AverageTimeResponse {
  averageExecutionMinutes: number;
  totalFinishedOrders: number;
}

export interface DashboardResponse extends AverageTimeResponse {
  ordersByStatus: { status: string; count: string }[];
}

export class ReportMapper {
  static toAverageTime(raw: AverageTimeRaw | undefined): AverageTimeResponse {
    return {
      averageExecutionMinutes: raw?.avgMinutes
        ? parseFloat(Number(raw.avgMinutes).toFixed(2))
        : 0,
      totalFinishedOrders: parseInt(raw?.totalFinished ?? '0', 10),
    };
  }

  static toDashboard(
    avgTime: AverageTimeResponse,
    ordersByStatus: { status: string; count: string }[],
  ): DashboardResponse {
    return { ...avgTime, ordersByStatus };
  }
}
