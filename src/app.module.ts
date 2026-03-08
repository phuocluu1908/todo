import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoModule } from './todo/todo.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;
        const shouldUseSsl = !!(process.env.DB_SSL === 'true' || (databaseUrl && databaseUrl.includes('sslmode=require')));
        const base: any = {
          type: 'postgres',
          url: databaseUrl ?? undefined,
          host: databaseUrl ? undefined : process.env.DB_HOST ?? '127.0.0.1',
          port: databaseUrl ? undefined : Number(process.env.DB_PORT ?? 5432),
          username: databaseUrl ? undefined : process.env.DB_USER ?? 'root',
          password: databaseUrl ? undefined : process.env.DB_PASSWORD ?? '',
          database: databaseUrl ? undefined : process.env.DB_NAME ?? 'todo_db',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
        };
        if (shouldUseSsl) base.ssl = { rejectUnauthorized: false };
        return base;
      },
    }),
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true, // Generates schema automatically
      playground: true, // Enables GraphQL Playground
      path: 'graph/todo',
    }),
    TodoModule, // Import the Todo Module
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}
