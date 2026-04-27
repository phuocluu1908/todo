import { Body, Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { AuditService } from './audit.service';

class PublishDto {
  event: string;
  payload: any;
}

@Controller('audit')
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(private readonly audit: AuditService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'audit' };
  }

  @Post('publish')
  async publish(@Body() body: PublishDto) {
    this.logger.log(`Publishing audit event: ${body.event}`);
    if (!body || !body.event) {
      this.logger.warn('Missing event in body', body);
      return { ok: false, error: 'missing event' };
    }
    await this.audit.publish(body.event, body.payload);
    return { ok: true };
  }

  @Get('events')
  async getEvents(
    @Query('event') event?: string,
    @Query('userId') userId?: number,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.audit.queryEvents({
      event,
      userId,
      limit,
      offset,
      fromDate,
      toDate,
    });
  }

  @Get('events/user/:userId')
  async getUserEvents(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.audit.getUserEvents(limit, offset);
  }

  @Get('stats')
  async getStats() {
    return this.audit.getStats();
  }

  @Post('cleanup')
  async cleanup(@Query('daysOld') daysOld: number = 90) {
    return this.audit.cleanupOldEvents(daysOld);
  }
}
