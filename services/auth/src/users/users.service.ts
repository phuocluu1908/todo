import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    avatar?: string;
  }): Promise<User> {
    const existingByUsername = await this.userRepo.findOne({ where: { username: userData.username } });
    if (existingByUsername) throw new ConflictException('Username already exists');

    const existingByEmail = await this.userRepo.findOne({ where: { email: userData.email } });
    if (existingByEmail) throw new ConflictException('Email already exists');

    const hashed = await bcrypt.hash(userData.password, 10);
    const user = this.userRepo.create({
      username: userData.username,
      email: userData.email,
      password: hashed,
      avatar: userData.avatar,
    });
    return this.userRepo.save(user);
  }

  async validatePassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}

