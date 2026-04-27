import { Injectable } from '@nestjs/common';

interface User {
  id: number;
  appUserId?: number;
  username: string;
  email?: string;
  password: string;
  avatar?: string;
}

@Injectable()
export class UsersService {
  // Minimal in-memory users store for scaffold/demo purposes
  private users: User[] = [
    {
      id: 1,
      appUserId: 1,
      username: 'alice',
      email: 'alice@example.com',
      password: 'password',
    },
    {
      id: 2,
      appUserId: 2,
      username: 'bob',
      email: 'bob@example.com',
      password: 'password',
    },
  ];

  private nextId = 3;

  async findByUsername(username: string) {
    return this.users.find((u) => u.username === username) || null;
  }

  async findById(id: number) {
    return this.users.find((u) => u.id === id) || null;
  }

  async createUser(userData: Partial<User>) {
    const user: User = {
      id: this.nextId++,
      appUserId: userData.appUserId,
      username: userData.username || '',
      email: userData.email || '',
      password: userData.password || '',
      avatar: userData.avatar,
    };

    this.users.push(user);
    const { password, ...result } = user;
    return result;
  }

  async getAllUsers() {
    return this.users.map(({ password, ...user }) => user);
  }
}
