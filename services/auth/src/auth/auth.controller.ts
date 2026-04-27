import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class RegisterDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

class RefreshDto {
  @IsString()
  refresh_token: string;
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
    const result = await this.auth.login(body.username, body.password);
    return { 
      status: 'success',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const result = await this.auth.register(
      body.username,
      body.email,
      body.password,
      body.avatar,
    );
    return {
      status: 'success',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    const result = await this.auth.refreshToken(body.refresh_token);
    return {
      status: 'success',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('logout')
  async logout(@Body() body: RefreshDto) {
    await this.auth.logout(body.refresh_token);
    return {
      status: 'success',
      data: { message: 'Logged out successfully' },
      timestamp: new Date().toISOString(),
    };
  }
}
