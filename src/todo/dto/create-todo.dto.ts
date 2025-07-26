import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTodoDto {
  @ApiProperty({ example: 'Buy milk', description: 'The title of the todo' })
  @IsNotEmpty()
  @IsString()
  title: string;
}
