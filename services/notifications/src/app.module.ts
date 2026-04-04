import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
})
export class AppModule {}
