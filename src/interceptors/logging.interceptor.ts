import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const url = req.url;
    const now = Date.now();
    const body: unknown = req.body;

    console.log(`[Request] ${method} ${url} ${JSON.stringify(body)} - Start`);

    return next
      .handle()
      .pipe(
        tap(() =>
          console.log(
            `[Request] ${method} ${url} - End (${Date.now() - now}ms)`,
          ),
        ),
      );
  }
}
