import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isConfigured = corsOrigins.includes(origin);

      let isLocalhost = false;
      try {
        const parsed = new URL(origin);
        isLocalhost =
          parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      } catch {
        isLocalhost = false;
      }

      if (isConfigured || isLocalhost) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin ${origin}`), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const port = process.env.PORT || 3002;
  await app.listen(+port);
  console.log(`Events service listening on ${port}`);
}

bootstrap();
