import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoModule } from './todo/todo.module';
import { UserModule } from './user/user.module';
import { SecurityModule } from './security/security.module';
import { ScheduleModule } from '@nestjs/schedule';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
      {
        name: 'long',
        ttl: 900000, // 15 minutes
        limit: 100, // 100 requests per 15 minutes
      },
    ]),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;
        const shouldUseSsl = !!(
          process.env.DB_SSL === 'true' ||
          (databaseUrl && databaseUrl.includes('sslmode=require'))
        );

        const useSqliteFallback =
          process.env.DB_TYPE === 'sqlite' || (!databaseUrl && !process.env.DB_HOST);

        if (useSqliteFallback) {
          return {
            type: 'sqlite',
            database: process.env.SQLITE_DB || 'todo.sqlite',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            migrations: [__dirname + '/migrations/*{.ts,.js}'],
            synchronize: true,
          } as any;
        }

        const base: any = {
          type: 'postgres',
          url: databaseUrl ?? undefined,
          host: databaseUrl ? undefined : (process.env.DB_HOST ?? '127.0.0.1'),
          port: databaseUrl ? undefined : Number(process.env.DB_PORT ?? 5432),
          username: databaseUrl ? undefined : (process.env.DB_USER ?? 'root'),
          password: databaseUrl ? undefined : (process.env.DB_PASSWORD ?? ''),
          database: databaseUrl
            ? undefined
            : (process.env.DB_NAME ?? 'todo_db'),
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
    SecurityModule,
  ],
})
export class AppModule {}
