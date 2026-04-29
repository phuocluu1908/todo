import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    'http://18.138.41.18:8080,http://ec2-18-138-41-18.ap-southeast-1.compute.amazonaws.com:8080,http://localhost:5173,http://localhost:5174,http://todo-app-lowcost-frontendbucket-h8gnxgvjtydn.s3-website-ap-southeast-1.amazonaws.com'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const s3WebsitePattern = /^https?:\/\/.+\.s3-website-ap-southeast-1\.amazonaws\.com$/;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || s3WebsitePattern.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const port = process.env.PORT || 3001;
  await app.listen(+port);
  console.log(`Auth service listening on ${port}`);
}

bootstrap();
