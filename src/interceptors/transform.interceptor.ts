import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<{ status: string; data: unknown; timestamp: string }> {
    return next.handle().pipe(
      map((data: unknown) => ({
        status: 'success',
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
