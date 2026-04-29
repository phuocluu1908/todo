import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { ErrorsLoggingInterceptor } from './interceptors/errors-logging.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { NotFoundExceptionFilter } from './filters/not-found-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    'http://18.138.41.18:8080,http://ec2-18-138-41-18.ap-southeast-1.compute.amazonaws.com:8080,http://localhost:5173,http://localhost:5174'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new TimeoutInterceptor(),
    new ErrorsLoggingInterceptor(),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new AllExceptionsFilter(),
    new NotFoundExceptionFilter(),
  );

  const config = new DocumentBuilder()
    .setTitle('Todo API')
    .setDescription('API documentation for the Todo app')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
