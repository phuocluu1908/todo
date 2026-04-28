import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) { callback(null, true); return; }
      const isConfigured = corsOrigins.includes(origin);
      let isLocalhost = false;
      try {
        const parsed = new URL(origin);
        isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      } catch { isLocalhost = false; }
      callback(isConfigured || isLocalhost ? null : new Error(`CORS blocked: ${origin}`), isConfigured || isLocalhost);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT || 3003;
  await app.listen(+port);
  console.log(`Audit service listening on ${port}`);
}

bootstrap();
