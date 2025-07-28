import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType()
export class TodoType {
  @Field(type => ID)
  id: number;

  @Field()
  title: string;

  @Field()
  completed: boolean;

  @Field({ nullable: true })
  dueDate?: Date;

  @Field()
  priority: string;

  @Field({ nullable: true })
  category?: string;
}