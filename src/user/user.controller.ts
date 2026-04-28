import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  Request,
  ValidationPipe,
  UsePipes,
  Delete,
  Param,
  SetMetadata,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/guards/roles.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(
    @Body()
    body: {
      username: string;
      email: string;
      password: string;
      avatar?: string;
      roles?: string[];
    },
  ) {
    return this.userService.createUser(
      body.username,
      body.email,
      body.password,
      body.avatar,
      body.roles,
    );
  }

  @SetMetadata('roles', ['admin'])
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get()
  async getAllUsers() {
    return this.userService.getAllUser();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req) {
    return this.userService.getProfile(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('change-password')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.userId, dto);
  }

  @SetMetadata('roles', ['admin'])
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('delete/:id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async deleteUser(@Param('id') id) {
    return this.userService.deleteUser(id);
  }

  @SetMetadata('roles', ['admin'])
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/roles')
  async updateUserRoles(
    @Param('id') id: string,
    @Body('roles') roles: string[] = [],
  ) {
    return this.userService.updateRoles(Number(id), roles);
  }
}
