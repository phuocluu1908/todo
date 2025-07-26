import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository, Between, FindOptionsWhere, Like} from 'typeorm';
import { Todo } from './todo.entity';
import { User } from '../user/user.entity';
import { Observable, from } from 'rxjs';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { ActivityLog } from './activity-log.entity';

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(Todo) private readonly todoRepo: Repository<Todo>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ActivityLog) private readonly logRepo: Repository<ActivityLog>,
  ) {}

  // Get all todos
  getTodos(
    userId: number,
    completed?: boolean,
    page: number = 1,
    limit: number = 10,
    filters?: {
      priority?: 'low' | 'medium' | 'high',
      category?: string,
      dueFrom?: string,
      dueTo?: string,
      search?: string,
    }
  ): Observable<Todo[]> {
    const where: FindOptionsWhere<Todo> = { user: { id: userId } } as any;
    if (completed !== undefined) where.completed = completed;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;
    if (filters?.dueFrom && filters?.dueTo) {
      where.dueDate = Between(new Date(filters.dueFrom), new Date(filters.dueTo));
    } else if (filters?.dueFrom) {
      where.dueDate = Between(new Date(filters.dueFrom), new Date('9999-12-31'));
    } else if (filters?.dueTo) {
      where.dueDate = Between(new Date('1970-01-01'), new Date(filters.dueTo));
    }
    if (filters?.search) where.title = Like(`%${filters.search}%`);
  
    return from(
      this.todoRepo.find({
        where,
        skip: (page - 1) * limit,
        take: limit,
        order: { id: 'ASC' },
      }),
    );
  }

  // Get a single todo
  getTodoById(id: number): Observable<Todo | null> {
    return from(
      this.todoRepo.findOne({ where: { id } }).then((todo) => {
        if (!todo) throw new NotFoundException(`Todo with id ${id} not found`);
        return todo;
      }),
    );
  }

  // Create a new todo
  async createTodo(
    createTodoDto: CreateTodoDto,
    userId: number,
  ): Promise<Todo> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);
    const newTodo = this.todoRepo.create({
      ...createTodoDto,
      dueDate: createTodoDto.dueDate ? new Date(createTodoDto.dueDate) : null,
      priority: createTodoDto.priority ?? 'medium',
      category: createTodoDto.category ?? null,
      user,
    });
    await this.logActivity(user, newTodo, 'created');
    return this.todoRepo.save(newTodo);
  }

  // Update a todo
  async updateTodo(id: number, updateDto: UpdateTodoDto): Promise<Todo> {
    const todo = await this.todoRepo.findOne({ where: { id } });
    if (!todo) throw new NotFoundException(`Todo with id ${id} not found`);
    if (updateDto.title !== undefined) todo.title = updateDto.title;
    if (updateDto.completed !== undefined) todo.completed = updateDto.completed;
    if (updateDto.dueDate !== undefined)
      todo.dueDate = updateDto.dueDate ? new Date(updateDto.dueDate) : null;
    if (updateDto.priority !== undefined) todo.priority = updateDto.priority;
    if (updateDto.category !== undefined) todo.category = updateDto.category;
    await this.logActivity(todo.user, todo, 'updated');
    return this.todoRepo.save(todo);
  }

  // Find todos due within the next X minutes
  async findTodosDueSoon(minutes = 10): Promise<Todo[]> {
    const now = new Date();
    const soon = new Date(now.getTime() + minutes * 60000);
    return this.todoRepo.find({
      where: {
        dueDate: Between(now, soon),
        completed: false,
      },
      relations: ['user'],
    });
  }

  // Delete a todo
  deleteTodo(id: number): Observable<DeleteResult> {
    return from(
      this.todoRepo.findOne({ where: { id } }).then((todo) => {
        if (!todo) throw new NotFoundException(`Todo with id ${id} not found`);
        return this.todoRepo.delete(id);
      }),
    );
  }

  // Soft delete a todo
  softDeleteTodo(id: number): Observable<DeleteResult> {
    return from(this.todoRepo.softDelete(id));
  }

  // Restore a soft-deleted todo
  restoreTodo(id: number): Observable<any> {
    return from(this.todoRepo.restore(id));
  }

  private async logActivity(user: User, todo: Todo | null, action: string, details?: string) {
    const log = this.logRepo.create({ user, todo, action, details: details ?? null });
    await this.logRepo.save(log);
  }

  async getActivityLog(userId: number) {
    return this.logRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: 100, // limit to last 100 actions
    });
  }
}
