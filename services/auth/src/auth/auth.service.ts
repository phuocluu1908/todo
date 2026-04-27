import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import axios, { AxiosError } from 'axios';
// NOTE: we don't import the audit producer at module load time because the
// monorepo `libs` path may not be available inside container build/runtime.
// We'll attempt a dynamic require at runtime in `login()` and ignore failures.

@Injectable()
export class AuthService {
  private refreshTokenStore = new Map<string, string>(); // Simple in-memory refresh token storage
  private readonly appServiceUrl = process.env.APP_SERVICE_URL || 'http://app:3000';

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
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    const payload = {
      sub: (user as any).appUserId ?? user.id,
      username: user.username,
    };
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const accessExpiresIn = '15m';
    const refreshExpiresIn = '7d';

    const accessToken = await new JwtService({ secret }).signAsync(payload, { expiresIn: accessExpiresIn });
    const refreshToken = await new JwtService({ secret }).signAsync(payload, { expiresIn: refreshExpiresIn });
    
    // Store refresh token
    this.refreshTokenStore.set(refreshToken, JSON.stringify(payload));

    // publish audit event (fire-and-forget). Use dynamic require so container
    // runtime that doesn't include the monorepo libs won't crash.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createAndPublish } = require('../../../../libs/audit/src/producer');
      createAndPublish('auth.login', { userId: user.id, username: user.username }).catch((err: any) => {
        // do not block login on audit failures
        // eslint-disable-next-line no-console
        console.error('audit publish failed', err && err.message ? err.message : err);
      });
    } catch (e) {
      // libs not available inside container build/runtime — ignore
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes in seconds
    };
  }

  async register(username: string, email: string, password: string, avatar?: string) {
    // Check if user already exists
    const existingUser = await this.users.findByUsername(username);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const appUserId = await this.registerUserInAppService(
      username,
      email,
      password,
      avatar,
    );

    // Create new user
    await this.users.createUser({
      username,
      email,
      password,
      avatar,
      appUserId,
    });

    // Auto-login after registration
    return this.login(username, password);
  }

  private async registerUserInAppService(
    username: string,
    email: string,
    password: string,
    avatar?: string,
  ): Promise<number | undefined> {
    try {
      const response = await axios.post(`${this.appServiceUrl}/user/register`, {
        username,
        email,
        password,
        avatar,
      });

      const payload = response.data?.data ?? response.data;
      if (payload?.id && Number.isFinite(Number(payload.id))) {
        return Number(payload.id);
      }

      return undefined;
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const message = error.response?.data?.message;

        if (status === 409) {
          throw new ConflictException(
            Array.isArray(message) ? message.join(', ') : message || 'User already exists',
          );
        }

        if (status === 400) {
          throw new BadRequestException(
            Array.isArray(message) ? message.join(', ') : message || 'Invalid registration data',
          );
        }
      }

      throw new BadRequestException('Failed to sync user into app service');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret';
      const jwtService = new JwtService({ secret });
      
      // Verify refresh token
      const payload = await jwtService.verifyAsync(refreshToken);
      
      // Check if token is in store
      if (!this.refreshTokenStore.has(refreshToken)) {
        throw new UnauthorizedException('Refresh token not found or revoked');
      }

      // Generate new access token
      const newAccessToken = await jwtService.signAsync(
        { sub: payload.sub, username: payload.username },
        { expiresIn: '15m' }
      );

      return {
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: 900, // 15 minutes in seconds
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string) {
    this.refreshTokenStore.delete(refreshToken);
    return { message: 'Logged out successfully' };
  }
}
