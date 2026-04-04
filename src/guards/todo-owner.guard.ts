import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { TodoService } from '../todo/todo.service';
import { firstValueFrom } from 'rxjs';

interface AuthenticatedRequest extends Request {
  user: { userId: string; roles?: string[] };
  todo?: any;
  params: { id: string };
}

@Injectable()
export class TodoOwnerGuard implements CanActivate {
  constructor(private readonly todoService: TodoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user; // assuming user is attached by auth middleware
    const todoId = Number(request.params.id); // assuming :id in route

    const todo = await firstValueFrom(this.todoService.getTodoById(todoId));
    if (!todo) {
      throw new NotFoundException('Todo not found');
    }
    if (
      String(todo.user.id) !== user.userId &&
      !request?.user?.roles?.includes('admin')
    ) {
      throw new ForbiddenException('You do not have access to this todo');
    }

    request.todo = todo;

    return true;
  }
}
