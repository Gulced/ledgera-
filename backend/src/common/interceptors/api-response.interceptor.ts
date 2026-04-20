import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, { success: true; data: T; timestamp: string }>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<{ success: true; data: T; timestamp: string }> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
