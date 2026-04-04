import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  // Minimal in-memory users store for scaffold/demo purposes
  private users = [
    { id: 1, username: 'alice', password: 'password' },
    { id: 2, username: 'bob', password: 'password' },
  ];

  async findByUsername(username: string) {
    return this.users.find((u) => u.username === username) || null;
  }

  async findById(id: number) {
    return this.users.find((u) => u.id === id) || null;
  }
}
