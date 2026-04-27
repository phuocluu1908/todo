import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ReportingService } from './reporting.service';

@Controller('reporting')
export class ReportingController {
  private readonly logger = new Logger(ReportingController.name);

  constructor(private readonly reportingService: ReportingService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'reporting' };
  }

  @Get('dashboard')
  async getDashboard(
    @Query('userId') userId: number,
    @Query('token') token?: string,
  ) {
    this.logger.log(`Fetching dashboard for user ${userId}`);
    try {
      const stats = await this.reportingService.getDashboardStats(userId, token);
      return { ok: true, data: stats };
    } catch (error) {
      this.logger.error('Dashboard fetch failed', error instanceof Error ? error.message : String(error));
      return { ok: false, error: 'Failed to fetch dashboard stats' };
    }
  }

  @Get('dashboard/priority')
  async getPriorityBreakdown(
    @Query('userId') userId: number,
    @Query('token') token?: string,
  ) {
    this.logger.log(`Fetching priority breakdown for user ${userId}`);
    try {
      const breakdown = await this.reportingService.getPriorityBreakdown(userId, token);
      return { ok: true, data: breakdown };
    } catch (error) {
      this.logger.error('Priority breakdown fetch failed', error instanceof Error ? error.message : String(error));
      return { ok: false, error: 'Failed to fetch priority breakdown' };
    }
  }

  @Get('dashboard/category')
  async getCategoryBreakdown(
    @Query('userId') userId: number,
    @Query('token') token?: string,
  ) {
    this.logger.log(`Fetching category breakdown for user ${userId}`);
    try {
      const breakdown = await this.reportingService.getCategoryBreakdown(userId, token);
      return { ok: true, data: breakdown };
    } catch (error) {
      this.logger.error('Category breakdown fetch failed', error instanceof Error ? error.message : String(error));
      return { ok: false, error: 'Failed to fetch category breakdown' };
    }
  }

  @Get('dashboard/trend')
  async getCompletionTrend(
    @Query('userId') userId: number,
    @Query('days') days: number = 30,
    @Query('token') token?: string,
  ) {
    this.logger.log(`Fetching completion trend for user ${userId}`);
    try {
      const trend = await this.reportingService.getCompletionTrend(userId, days, token);
      return { ok: true, data: trend };
    } catch (error) {
      this.logger.error('Trend fetch failed', error instanceof Error ? error.message : String(error));
      return { ok: false, error: 'Failed to fetch completion trend' };
    }
  }
}
