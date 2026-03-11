import {
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateTodoDto {
  @Field()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @Field({ nullable: true })
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @Field({ nullable: true })
  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';

  @Field({ nullable: true })
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @Field({ nullable: true })
  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly'] })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  recurrence?: 'daily' | 'weekly' | 'monthly';

  @Field({ nullable: true })
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  recurrenceEnd?: string;
}
