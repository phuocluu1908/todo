import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from './todo.entity';
import { User } from '../user/user.entity';
import { TodoService } from './todo.service';
import { TodoController } from './todo.controller';
import { ReminderService } from './reminder.service';
import { ActivityLog } from './activity-log.entity';
import { TodoResolver } from './todo.resolver';
import { RolesGuard } from 'src/guards/roles.guard';
import { TodoOwnerGuard } from 'src/guards/todo-owner.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Todo, User, ActivityLog])],
  providers: [TodoService, ReminderService, TodoResolver, RolesGuard, TodoOwnerGuard],
  controllers: [TodoController],
})
export class TodoModule {}
