import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UsePipes,
  ValidationPipe,
  Query,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { CreateTodoDto } from './dto/create-todo.dto';
import { TodoService } from './todo.service';
import { Observable } from 'rxjs';
import { DeleteResult } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { ParseIntPipe } from '../pipes/parse-int.pipe';
import { TrimPipe } from '../pipes/trim.pipe';
import { DefaultValuePipe } from '../pipes/default-value.pipe';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { TodoOwnerGuard } from 'src/guards/todo-owner.guard';

@UseGuards(AuthGuard('jwt'))
@Controller('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  getTodos(
    @CurrentUser() user,
    @Query('completed') completed?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('priority') priority?: 'low' | 'medium' | 'high',
    @Query('category') category?: string,
    @Query('dueFrom') dueFrom?: string,
    @Query('dueTo') dueTo?: string,
    @Query('search') search?: string,
  ) {
    const isCompleted =
      completed !== undefined ? completed === 'true' : undefined;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const userId = user.userId;

    return this.todoService.getTodos(userId, isCompleted, pageNum, limitNum, {
      priority,
      category,
      dueFrom,
      dueTo,
      search,
    });
  }

  @Get(':id')
  @UseGuards(TodoOwnerGuard)
  getTodoById(@Request() req): any {
    return req.todo;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new todo' })
  @ApiResponse({
    status: 201,
    description: 'The todo has been successfully created.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createTodo(
    @Body('title', TrimPipe) title: string,
    @Body('priority', new DefaultValuePipe('medium')) priority: string,
    @Body() createTodoDto: CreateTodoDto,
    @Request() req,
  ) {
    return this.todoService.createTodo(createTodoDto, req.user.userId);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateTodo(@Param('id') id: number, @Body() updateDto: UpdateTodoDto) {
    return this.todoService.updateTodo(Number(id), updateDto);
  }

  @Delete(':id')
  deleteTodo(@Param('id') id: number): Observable<DeleteResult> {
    return this.todoService.deleteTodo(Number(id));
  }

  @Delete(':id/soft')
  softDeleteTodo(@Param('id') id: string) {
    return this.todoService.softDeleteTodo(Number(id));
  }

  // Restore endpoint
  @Patch(':id/restore')
  restoreTodo(@Param('id') id: string) {
    return this.todoService.restoreTodo(Number(id));
  }

  @Get('activity-log')
  async getActivityLog(@Request() req) {
    return this.todoService.getActivityLog(req.user.userId);
  }
}
