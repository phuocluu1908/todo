import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsDateString, IsIn } from 'class-validator';


export class CreateTodoDto {
  @ApiProperty({ example: 'Buy milk', description: 'The title of the todo' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: '2024-07-28T12:00:00Z', description: 'Due date for the todo', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ example: 'medium', description: 'Priority of the todo', required: false, enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';

  @ApiProperty({ example: 'work', description: 'Category of the todo', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'daily', description: 'Recurrence pattern', required: false, enum: ['daily', 'weekly', 'monthly'] })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  recurrence?: 'daily' | 'weekly' | 'monthly';

  @ApiProperty({ example: '2024-12-31T23:59:59Z', description: 'Recurrence end date', required: false })
  @IsOptional()
  @IsDateString()
  recurrenceEnd?: string;
}
