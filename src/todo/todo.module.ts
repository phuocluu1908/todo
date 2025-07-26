import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from './todo.entity';
import { User } from '../user/user.entity';
import { TodoService } from './todo.service';
import { TodoController } from './todo.controller';
import { ReminderService } from './reminder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Todo, User])],
  providers: [TodoService, ReminderService],
  controllers: [TodoController],
})
export class TodoModule {}
