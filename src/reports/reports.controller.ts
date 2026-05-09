import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('average-time')
  @ApiOperation({ summary: 'Average service execution time' })
  getAverageTime() {
    return this.reportsService.getAverageExecutionTime();
  }

  @Get('orders-by-status')
  @ApiOperation({ summary: 'Service order count by status' })
  getOrdersByStatus() {
    return this.reportsService.getOrdersByStatus();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard with general metrics' })
  getDashboard() {
    return this.reportsService.getDashboard();
  }
}
