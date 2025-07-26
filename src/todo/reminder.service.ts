import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TodoService } from './todo.service';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(private readonly todoService: TodoService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleReminders() {
    const dueTodos = await this.todoService.findTodosDueSoon(10); // next 10 minutes
    dueTodos.forEach(todo => {
      this.logger.log(
        `Reminder: Todo "${todo.title}" for user "${todo.user.username}" is due at ${todo.dueDate}`,
      );
    });
  }
}