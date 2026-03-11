import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class ErrorsLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err: Error) => {
        const req = context.switchToHttp().getRequest<Request>();
        console.error(`[Error] ${req.method} ${req.url}:`, err.message || err);
        throw err;
      }),
    );
  }
}
