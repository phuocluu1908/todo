import { Test, TestingModule } from '@nestjs/testing';
import { TodoService } from './todo.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Todo } from './todo.entity';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { ActivityLog } from './activity-log.entity';

describe('TodoService', () => {
  let service: TodoService;
  let repo: Repository<Todo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoService,
        {
          provide: getRepositoryToken(Todo),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ActivityLog),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<TodoService>(TodoService);
    repo = module.get<Repository<Todo>>(getRepositoryToken(Todo));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTodo', () => {
    it('should create and return a todo', async () => {
      const createTodoDto = { title: 'Test Todo', description: 'Test Desc' };
      const userId = 1;
      const savedTodo = { id: 1, ...createTodoDto, userId };

      jest.spyOn(repo, 'save').mockResolvedValue(savedTodo as any);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue({ id: userId } as any);

      const result = await service.createTodo(createTodoDto as any, userId);
      expect(result).toEqual(savedTodo);
      expect(repo.save).toHaveBeenCalledWith({ ...createTodoDto, userId });
    });
  });

  // Add more tests for other service methods as needed
});