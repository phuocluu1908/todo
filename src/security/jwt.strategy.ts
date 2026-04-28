import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your_jwt_secret',
    });
  }

  async validate(payload: any) {
    let roles = Array.isArray(payload.roles) ? payload.roles : undefined;

    if (!roles || roles.length === 0) {
      const user = await this.userRepository.findOne({
        where: { id: Number(payload.sub) },
        select: ['id', 'roles'],
      });
      roles = user?.roles ?? [];
    }

    return {
      userId: payload.sub,
      username: payload.username,
      roles,
    };
  }
}
