import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
// NOTE: we don't import the audit producer at module load time because the
// monorepo `libs` path may not be available inside container build/runtime.
// We'll attempt a dynamic require at runtime in `login()` and ignore failures.

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

    return new JwtService({ secret }).signAsync(payload, { expiresIn });
  }
}
