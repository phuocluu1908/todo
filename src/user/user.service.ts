import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async getAllUser() {
    return this.userRepo.find();
  }

  async createUser(
    username: string,
    email: string,
    password: string,
    avatar?: string,
    roles?: string[],
  ): Promise<User> {
    const existingByUsername = await this.userRepo.findOne({
      where: { username },
    });
    if (existingByUsername) {
      throw new ConflictException('Username already exists');
    }

    const existingByEmail = await this.userRepo.findOne({
      where: { email },
    });
    if (existingByEmail) {
      throw new ConflictException('Email already exists');
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      username,
      email,
      password: hashed,
      avatar,
      roles,
    });
    return this.userRepo.save(user);
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.findByUsername(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    // Do not return password
    const { password, refreshToken, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (dto.username) user.username = dto.username;
    if (dto.email) user.email = dto.email;
    if (dto.avatar) user.avatar = dto.avatar;
    await this.userRepo.save(user);
    const { password, refreshToken, ...profile } = user;
    return profile;
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch)
      throw new BadRequestException('Current password is incorrect');
    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);
    return { message: 'Password changed successfully' };
  }

  async deleteUser(userId: number) {
    const userToRemove = await this.userRepo.findOne({ where: { id: userId } });
    if (userToRemove) {
      await this.userRepo.remove(userToRemove);
    }
  }

  async saveRefreshToken(userId: number, refreshToken: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.refreshToken = refreshToken;
    await this.userRepo.save(user);
  }

  async clearRefreshToken(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.refreshToken = null as any;
    await this.userRepo.save(user);
  }
}
