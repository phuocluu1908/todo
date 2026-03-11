import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  OneToMany,
} from 'typeorm';
import { Todo } from '../todo/todo.entity';

@Entity()
@Unique(['username'])
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  email: string; // <-- New field

  @Column({ nullable: true })
  avatar: string; // <-- New field

  @Column({ nullable: true, type: 'simple-array' })
  roles: string[]; // <-- New field

  @Column()
  password: string; // Hashed password

  @OneToMany(() => Todo, (todo) => todo.user)
  todos: Todo[];
}
