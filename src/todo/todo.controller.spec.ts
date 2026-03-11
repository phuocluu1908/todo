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
  let userRepo: Repository<User>;
  let logRepo: Repository<ActivityLog>;

  beforeEach(async () => {
    const todoRepoMock = {
      create: jest.fn((obj) => ({ ...obj })),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;
    const userRepoMock = {
      findOne: jest.fn(),
    } as any;
    const logRepoMock = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoService,
        { provide: getRepositoryToken(Todo), useValue: todoRepoMock },
        { provide: getRepositoryToken(User), useValue: userRepoMock },
        { provide: getRepositoryToken(ActivityLog), useValue: logRepoMock },
      ],
    }).compile();

    service = module.get<TodoService>(TodoService);
    repo = module.get<Repository<Todo>>(getRepositoryToken(Todo));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    logRepo = module.get<Repository<ActivityLog>>(
      getRepositoryToken(ActivityLog),
    );

    // Provide basic mocks for Repository methods used by the service
    if (!repo.create) (repo as any).create = jest.fn((obj) => obj);
    if (!repo.save) (repo as any).save = jest.fn();
    if (!userRepo.findOne) (userRepo as any).findOne = jest.fn();
    if (!logRepo.create) (logRepo as any).create = jest.fn((obj) => obj);
    if (!logRepo.save) (logRepo as any).save = jest.fn();
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
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createTodoDto,
          user: { id: userId },
        }),
      );
    });
  });

  // Add more tests for other service methods as needed
});
