import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository, Between } from 'typeorm';
import { Todo } from './todo.entity';
import { User } from '../user/user.entity';
import { Observable, from } from 'rxjs';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';


@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(Todo) private readonly todoRepo: Repository<Todo>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // Get all todos
  getTodos(
    userId: number,
    completed?: boolean,
    page: number = 1,
    limit: number = 10,
  ): Observable<Todo[]> {
    const where: any = { user: { id: userId } };
    if (completed !== undefined) {
      where.completed = completed;
    }
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
      dueDate: createTodoDto.dueDate ? new Date(createTodoDto.dueDate) : undefined,
      user,
    });
    return this.todoRepo.save(newTodo);
  }

  // Update a todo
  async updateTodo(id: number, updateDto: UpdateTodoDto): Promise<Todo> {
    const todo = await this.todoRepo.findOne({ where: { id } });
    if (!todo) throw new NotFoundException(`Todo with id ${id} not found`);
    if (updateDto.title !== undefined) todo.title = updateDto.title;
    if (updateDto.completed !== undefined) todo.completed = updateDto.completed;
    if (updateDto.dueDate !== undefined) todo.dueDate = updateDto.dueDate ? new Date(updateDto.dueDate) : null;
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
}
