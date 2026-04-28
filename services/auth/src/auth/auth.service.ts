import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private refreshTokenStore = new Map<string, string>();

  constructor(private users: UsersService, private jwt: JwtService) {}

  async login(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await this.users.validatePassword(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, username: user.username };
    const secret = process.env.JWT_SECRET || 'dev-secret';

    const accessToken = await new JwtService({ secret }).signAsync(payload, { expiresIn: '15m' });
    const refreshToken = await new JwtService({ secret }).signAsync(payload, { expiresIn: '7d' });

    this.refreshTokenStore.set(refreshToken, JSON.stringify(payload));

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900,
    };
  }

  async register(username: string, email: string, password: string, avatar?: string) {
    await this.users.createUser({ username, email, password, avatar });
    return this.login(username, password);
  }

  async refreshToken(refreshToken: string) {
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret';
      const jwtService = new JwtService({ secret });

      const payload = await jwtService.verifyAsync(refreshToken);

      if (!this.refreshTokenStore.has(refreshToken)) {
        throw new UnauthorizedException('Refresh token not found or revoked');
      }

      const newAccessToken = await jwtService.signAsync(
        { sub: payload.sub, username: payload.username },
        { expiresIn: '15m' },
      );

      return {
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: 900,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string) {
    this.refreshTokenStore.delete(refreshToken);
    return { message: 'Logged out successfully' };
  }
}
