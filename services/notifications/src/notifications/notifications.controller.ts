import { Body, Controller, Get, Post, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

interface SendNotificationDto {
  userId?: number | null;
  userEmail?: string;
  channel: 'email' | 'push' | 'log' | 'webhook';
  message: string;
  subject?: string;
  webhookUrl?: string;
}

@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly svc: NotificationsService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'notifications' };
  }

  @Post('notify')
  async notify(@Body() body: SendNotificationDto) {
    this.logger.log(`Received notification request: ${body.channel} to ${body.userId || body.userEmail}`);
    return this.svc.notify(body);
  }

  @Post('notify/email')
  async notifyEmail(
    @Body() body: { userEmail: string; subject: string; message: string },
  ) {
    return this.svc.notify({
      userEmail: body.userEmail,
      channel: 'email',
      subject: body.subject,
      message: body.message,
    });
  }

  @Post('notify/push')
  async notifyPush(
    @Body() body: { userId: number; message: string; subject?: string },
  ) {
    return this.svc.notify({
      userId: body.userId,
      channel: 'push',
      subject: body.subject,
      message: body.message,
    });
  }

  @Post('notify/webhook')
  async notifyWebhook(
    @Body() body: { webhookUrl: string; message: string; subject?: string },
  ) {
    return this.svc.notify({
      channel: 'webhook',
      webhookUrl: body.webhookUrl,
      message: body.message,
      subject: body.subject,
    });
  }
}
