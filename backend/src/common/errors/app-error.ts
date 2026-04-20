import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export type AppErrorCode =
  | 'INVALID_STAGE_TRANSITION'
  | 'UNAUTHORIZED_TRANSACTION_ACCESS'
  | 'UNAUTHORIZED_LISTING_ACCESS'
  | 'FINANCIAL_LOCK_VIOLATION'
  | 'TRANSACTION_NOT_FOUND'
  | 'LISTING_NOT_FOUND'
  | 'AGENT_NOT_FOUND'
  | 'INVALID_PREVIEW_PAYLOAD'
  | 'INVALID_TRANSACTION_PAYLOAD'
  | 'INVALID_LISTING_PAYLOAD'
  | 'INVALID_USER_PAYLOAD'
  | 'ACCOUNT_ALREADY_EXISTS'
  | 'INVALID_LOGIN_CREDENTIALS'
  | 'UNAUTHORIZED_ACTOR_CONTEXT'
  | 'UNSUPPORTED_USER_ROLE'
  | 'MISSING_GEMINI_API_KEY'
  | 'GEMINI_REQUEST_FAILED'
  | 'GEMINI_EMPTY_RESPONSE';

type AppExceptionOptions = {
  code: AppErrorCode;
  message: string | string[];
  statusCode?: HttpStatus;
};

export class AppException extends HttpException {
  constructor({ code, message, statusCode = HttpStatus.BAD_REQUEST }: AppExceptionOptions) {
    super(
      {
        code,
        message,
      },
      statusCode,
    );
  }
}

export class AppBadRequestException extends BadRequestException {
  constructor(code: AppErrorCode, message: string | string[]) {
    super({
      code,
      message,
    });
  }
}

export class AppForbiddenException extends ForbiddenException {
  constructor(code: AppErrorCode, message: string | string[]) {
    super({
      code,
      message,
    });
  }
}

export class AppUnauthorizedException extends UnauthorizedException {
  constructor(code: AppErrorCode, message: string | string[]) {
    super({
      code,
      message,
    });
  }
}

export class AppNotFoundException extends NotFoundException {
  constructor(code: AppErrorCode, message: string | string[]) {
    super({
      code,
      message,
    });
  }
}
