import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';


export class CreateTodoDto {
  @ApiProperty({ example: 'Buy milk', description: 'The title of the todo' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: '2024-07-28T12:00:00Z', description: 'Due date for the todo', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
