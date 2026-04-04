import { Body, Controller, Get, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

@Controller()
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Post('notify')
  async notify(@Body() body: { userId?: number | null; channel: string; message: string }) {
    return this.svc.notify(body);
  }
}
