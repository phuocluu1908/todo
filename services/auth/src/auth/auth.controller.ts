import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

class LoginDto {
  username: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const token = await this.auth.login(body.username, body.password);
    return { accessToken: token };
  }
}
