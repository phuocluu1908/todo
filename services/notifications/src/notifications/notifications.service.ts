import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly todoApi = process.env.TODO_API_URL || 'http://localhost:3000/api';

  onModuleInit() {
    this.logger.log('NotificationsService initialized');
  }

  async notify(payload: { userId?: number | null; channel: string; message: string }) {
    // Placeholder delivery implementation — replace with email/push/ws integrations
    this.logger.log(`Notify user=${payload.userId} channel=${payload.channel} msg="${payload.message}"`);
    return { ok: true };
  }

  @Cron(process.env.POLL_CRON || '*/5 * * * *')
  async handleCron() {
    this.logger.debug('Running scheduled reminder scan');
    await this.scanAndNotify();
  }

  private async scanAndNotify() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await axios.get(`${this.todoApi}/todos?dueFrom=${today}&dueTo=${today}`);
      const todos = res.data?.data || res.data || [];
      if (Array.isArray(todos) && todos.length) {
        for (const todo of todos) {
          const msg = `Reminder: ${todo.title} is due ${todo.dueDate}`;
          await this.notify({ userId: todo.userId || null, channel: 'log', message: msg });
        }
      }
    } catch (err) {
      this.logger.error('scanAndNotify error', err instanceof Error ? err.stack : String(err));
    }
  }
}
