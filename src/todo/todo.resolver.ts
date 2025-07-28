import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { TodoService } from './todo.service';
import { TodoType } from './todo.type';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { Todo } from './todo.entity';

@Resolver(of => TodoType)
export class TodoResolver {
  constructor(private readonly todoService: TodoService) {}

  @Query(returns => [TodoType])
  async todos(): Promise<Todo[]> {
    // For demo: return all todos (in real app, filter by user)
    return this.todoService.findAllTodos();;
  }

  @Query(returns => TodoType, { nullable: true })
  async todo(@Args('id', { type: () => Int }) id: number): Promise<Todo | null> {
    return this.todoService.findTodoById(id);
  }
  
  @Mutation(returns => TodoType)
  async createTodo(
    @Args('input') input: CreateTodoDto,
  ): Promise<Todo> {
    // For demo: use userId=1, in real app, get from context
    return this.todoService.createTodo(input, 1);
  }
  
  @Mutation(returns => TodoType)
  async updateTodo(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateTodoDto,
  ): Promise<Todo> {
    return this.todoService.updateTodo(id, input);
  }

  @Mutation(returns => Boolean)
  async deleteTodo(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<boolean> {
    await this.todoService.deleteTodo(id).toPromise();
    return true;
  }
}