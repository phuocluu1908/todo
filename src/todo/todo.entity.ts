import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Todo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'datetime', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'varchar', default: 'medium' })
  priority: 'low' | 'medium' | 'high';

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @ManyToOne(() => User, (user) => user.todos, { eager: true })
  user: User;

  @Column({ type: 'varchar', nullable: true })
  recurrence: 'daily' | 'weekly' | 'monthly' | null;

  @Column({ type: 'datetime', nullable: true })
  recurrenceEnd: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
