import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const code =
      typeof exceptionResponse === 'object' &&
      exceptionResponse &&
      'code' in exceptionResponse &&
      typeof exceptionResponse.code === 'string'
        ? exceptionResponse.code
        : status === HttpStatus.BAD_REQUEST
          ? 'VALIDATION_ERROR'
          : status === HttpStatus.UNAUTHORIZED
            ? 'UNAUTHORIZED'
            : status === HttpStatus.FORBIDDEN
              ? 'FORBIDDEN'
              : status === HttpStatus.NOT_FOUND
                ? 'NOT_FOUND'
                : 'INTERNAL_SERVER_ERROR';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof exceptionResponse === 'object' &&
            exceptionResponse &&
            'message' in exceptionResponse
          ? exceptionResponse.message
          : exception instanceof Error
            ? exception.message
            : 'Internal server error';

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        code,
        message,
        path: request.url,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
