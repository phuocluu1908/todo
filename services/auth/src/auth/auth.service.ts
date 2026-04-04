import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  async validateUser(username: string, pass: string) {
    const user = await this.users.findByUsername(username);
    if (!user) return null;
    // NOTE: replace with proper password hashing in real app
    if (user.password !== pass) return null;
    const { password, ...result } = user;
    return result;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) throw new UnauthorizedException();
    const payload = { sub: user.id, username: user.username };
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '3600s';
    return new JwtService({ secret }).signAsync(payload, { expiresIn });
  }
}
