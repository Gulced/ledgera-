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
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<{ success: true; data: T; timestamp: string }> {
    const request = context.switchToHttp().getRequest<{ path?: string; url?: string }>();
    const requestPath = request?.path ?? request?.url ?? '';

    if (requestPath === '/health') {
      return next.handle() as Observable<{ success: true; data: T; timestamp: string }>;
    }

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
