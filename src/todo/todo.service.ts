import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteResult,
  Repository,
  Between,
  FindOptionsWhere,
  Like,
} from 'typeorm';
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
    @InjectRepository(ActivityLog)
    private readonly logRepo: Repository<ActivityLog>,
  ) {}

  // Get all todos
  getTodos(
    userId: number,
    completed?: boolean,
    page: number = 1,
    limit: number = 10,
    filters?: {
      priority?: 'low' | 'medium' | 'high';
      category?: string;
      dueFrom?: string;
      dueTo?: string;
      search?: string;
    },
  ): Observable<Todo[]> {
    const where: FindOptionsWhere<Todo> = { user: { id: userId } };
    if (completed !== undefined) where.completed = completed;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;
    if (filters?.dueFrom && filters?.dueTo) {
      where.dueDate = Between(
        new Date(filters.dueFrom),
        new Date(filters.dueTo),
      );
    } else if (filters?.dueFrom) {
      where.dueDate = Between(
        new Date(filters.dueFrom),
        new Date('9999-12-31'),
      );
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

  async getBoard(userId: number, includeCompleted = true) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const preferences = (user?.boardColumns || []).filter(Boolean);

    const todos = await this.todoRepo.find({
      where: { user: { id: userId } },
      order: { id: 'ASC' },
    });

    const grouped = new Map<string, Todo[]>();
    const done: Todo[] = [];

    for (const todo of todos) {
      if (todo.completed) {
        if (includeCompleted) done.push(todo);
        continue;
      }

      const key = (todo.category || 'Uncategorized').trim() || 'Uncategorized';
      const current = grouped.get(key) || [];
      current.push(todo);
      grouped.set(key, current);
    }

    const groupedKeys = Array.from(grouped.keys());
    const groupedByLower = new Map<string, Todo[]>();
    for (const [key, value] of grouped.entries()) {
      groupedByLower.set(key.toLowerCase(), value);
    }
    const sortedRemainingKeys = groupedKeys
      .filter(
        (title) =>
          !preferences.some((preferred) => preferred.toLowerCase() === title.toLowerCase()),
      )
      .sort((a, b) => a.localeCompare(b));

    const orderedTitles = [
      ...preferences.filter((title) => title.toLowerCase() !== 'done'),
      ...sortedRemainingKeys,
    ];

    const dedupedOrderedTitles = orderedTitles.filter(
      (title, index) =>
        orderedTitles.findIndex((item) => item.toLowerCase() === title.toLowerCase()) === index,
    );

    const columns = dedupedOrderedTitles.map((title) => ({
      id: `category:${title.toLowerCase()}`,
      title,
      todos: groupedByLower.get(title.toLowerCase()) || [],
    }));

    if (includeCompleted) {
      columns.push({
        id: 'done',
        title: 'Done',
        todos: done,
      });
    }

    return {
      columns,
      total: todos.length,
      columnPreferences: dedupedOrderedTitles,
    };
  }

  async getBoardColumns(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return {
      columns: (user?.boardColumns || []).filter(Boolean),
    };
  }

  async saveBoardColumns(userId: number, columns: string[]) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);

    const normalized = (columns || [])
      .map((value) => (value || '').trim())
      .filter((value) => !!value && value.toLowerCase() !== 'done')
      .filter(
        (value, index, list) =>
          list.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index,
      );

    user.boardColumns = normalized;
    await this.userRepo.save(user);

    return {
      columns: normalized,
    };
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
    const savedTodo = await this.todoRepo.save(newTodo);
    await this.logActivity(user, savedTodo, 'created');
    // Fire-and-forget audit publish
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createAndPublish } = require('../../../../libs/audit/src/producer');
      createAndPublish('todo.created', { todoId: savedTodo.id, userId: user.id, title: savedTodo.title }).catch((err: any) => {
        // do not block on audit failures
        // eslint-disable-next-line no-console
        console.error('audit publish failed', err && err.message ? err.message : err);
      });
    } catch (e) {
      // libs may not be available in container build/runtime — ignore
    }

    return savedTodo;
  }

  // Update a todo
  async updateTodo(id: number, updateDto: UpdateTodoDto, userId?: number): Promise<Todo> {
    const todo = await this.todoRepo.findOne({ where: { id }, relations: ['user'] });
    if (!todo) throw new NotFoundException(`Todo with id ${id} not found`);
    
    // Verify ownership if userId is provided
    if (userId && todo.user.id !== userId) {
      throw new NotFoundException(`Todo with id ${id} not found`);
    }

    if (updateDto.title !== undefined) todo.title = updateDto.title;
    if (updateDto.completed !== undefined) todo.completed = updateDto.completed;
    if (updateDto.dueDate !== undefined)
      todo.dueDate = updateDto.dueDate ? new Date(updateDto.dueDate) : null;
    if (updateDto.priority !== undefined) todo.priority = updateDto.priority;
    if (updateDto.category !== undefined) todo.category = updateDto.category;
    if (updateDto.recurrence !== undefined)
      todo.recurrence = updateDto.recurrence;
    if (updateDto.recurrenceEnd !== undefined)
      todo.recurrenceEnd = updateDto.recurrenceEnd
        ? new Date(updateDto.recurrenceEnd)
        : null;

    // Handle recurring todos: auto-create next instance if just completed
    if (
      updateDto.completed === true &&
      todo.recurrence &&
      todo.dueDate &&
      (!todo.recurrenceEnd || todo.dueDate < new Date(todo.recurrenceEnd))
    ) {
      let nextDueDate: Date | null = null;
      if (todo.recurrence === 'daily') {
        nextDueDate = new Date(todo.dueDate);
        nextDueDate.setDate(nextDueDate.getDate() + 1);
      } else if (todo.recurrence === 'weekly') {
        nextDueDate = new Date(todo.dueDate);
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      } else if (todo.recurrence === 'monthly') {
        nextDueDate = new Date(todo.dueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }
      if (
        nextDueDate &&
        (!todo.recurrenceEnd || nextDueDate <= new Date(todo.recurrenceEnd))
      ) {
        const newTodo = this.todoRepo.create({
          ...todo,
          id: undefined,
          completed: false,
          dueDate: nextDueDate,
          createdAt: undefined,
          updatedAt: undefined,
          deletedAt: undefined,
        });
        await this.todoRepo.save(newTodo);
      }
    }

    const updated = await this.todoRepo.save(todo);

    // Fire-and-forget audit publish
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createAndPublish } = require('../../../../libs/audit/src/producer');
      createAndPublish('todo.updated', { todoId: updated.id, changes: updateDto }).catch((err: any) => {
        // eslint-disable-next-line no-console
        console.error('audit publish failed', err && err.message ? err.message : err);
      });
    } catch (e) {
      // ignore
    }

    return updated;
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
  async deleteTodo(id: number, userId?: number): Promise<DeleteResult> {
    const todo = await this.todoRepo.findOne({ where: { id }, relations: ['user'] });
    if (!todo) throw new NotFoundException(`Todo with id ${id} not found`);
    
    // Verify ownership if userId is provided
    if (userId && todo.user.id !== userId) {
      throw new NotFoundException(`Todo with id ${id} not found`);
    }
    
    const res = await this.todoRepo.delete(id);

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createAndPublish } = require('../../../../libs/audit/src/producer');
      createAndPublish('todo.deleted', { todoId: id, userId: todo.user?.id ?? null }).catch((err: any) => {
        // eslint-disable-next-line no-console
        console.error('audit publish failed', err && err.message ? err.message : err);
      });
    } catch (e) {
      // ignore
    }

    return res;
  }

  // Soft delete a todo
  async softDeleteTodo(id: number, userId?: number): Promise<DeleteResult> {
    const todo = await this.todoRepo.findOne({ where: { id }, relations: ['user'] });
    if (!todo) throw new NotFoundException(`Todo with id ${id} not found`);
    
    // Verify ownership if userId is provided
    if (userId && todo.user.id !== userId) {
      throw new NotFoundException(`Todo with id ${id} not found`);
    }
    
    const res = await this.todoRepo.softDelete(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createAndPublish } = require('../../../../libs/audit/src/producer');
      createAndPublish('todo.soft_deleted', { todoId: id, userId: todo?.user?.id ?? null }).catch((err: any) => {
        // eslint-disable-next-line no-console
        console.error('audit publish failed', err && err.message ? err.message : err);
      });
    } catch (e) {
      // ignore
    }
    return res;
  }

  // Restore a soft-deleted todo
  async restoreTodo(id: number, userId?: number): Promise<any> {
    const todo = await this.todoRepo.findOne({ where: { id }, relations: ['user'] });
    if (!todo) throw new NotFoundException(`Todo with id ${id} not found`);
    
    // Verify ownership if userId is provided
    if (userId && todo.user.id !== userId) {
      throw new NotFoundException(`Todo with id ${id} not found`);
    }
    
    const res = await this.todoRepo.restore(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createAndPublish } = require('../../../../libs/audit/src/producer');
      createAndPublish('todo.restored', { todoId: id }).catch((err: any) => {
        // eslint-disable-next-line no-console
        console.error('audit publish failed', err && err.message ? err.message : err);
      });
    } catch (e) {
      // ignore
    }
    return res;
  }

  private async logActivity(
    user: User,
    todo: Todo | null,
    action: string,
    details?: string,
  ) {
    const log = this.logRepo.create({
      user,
      todo,
      action,
      details: details ?? null,
    });
    await this.logRepo.save(log);
  }

  async getActivityLog(userId: number) {
    return this.logRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: 100, // limit to last 100 actions
    });
  }

  public async findAllTodos(): Promise<Todo[]> {
    return this.todoRepo.find();
  }

  public async findTodoById(id: number): Promise<Todo | null> {
    return this.todoRepo.findOne({ where: { id } });
  }
}
