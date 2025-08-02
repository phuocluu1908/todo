import { CanActivate, ExecutionContext, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TodoService } from '../todo/todo.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TodoOwnerGuard implements CanActivate {
  constructor(private readonly todoService: TodoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // assuming user is attached by auth middleware
    const todoId = request.params.id; // assuming :id in route

    const todo = await firstValueFrom(this.todoService.getTodoById(todoId));
    if (!todo) {
      throw new NotFoundException('Todo not found');
    }
    if (todo.user.id !== user.userId && !request?.user?.roles?.includes('admin')) {
      throw new ForbiddenException('You do not have access to this todo');
    }

    request.todo = todo;
    
    return true;
  }
}