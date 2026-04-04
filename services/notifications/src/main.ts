import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe, Logger } from '@nestjs/common';
import dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT || 4001);
  await app.listen(port);
  Logger.log(`Notifications service listening on ${port}`);
}

bootstrap();
