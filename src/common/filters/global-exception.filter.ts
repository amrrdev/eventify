import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let error: string;
    let details: any = null;

    if (exception instanceof HttpException) {
      // Handle known HTTP exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || 'Bad Request';
        details = (exceptionResponse as any).details || null;
      } else {
        message = exception.message;
        error = this.getErrorName(status);
      }
    } else if (exception instanceof Error) {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = process.env.NODE_ENV === 'production' ? 'Internal server error' : exception.message;
      error = 'Internal Server Error';

      // Log the full error in development/staging
      if (process.env.NODE_ENV !== 'production') {
        details = {
          stack: exception.stack,
          name: exception.name,
        };
      }
    } else {
      // Handle unknown exceptions
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'Internal Server Error';
    }

    // Log error details
    this.logError(exception, request, status);

    // Send response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV !== 'production' && {
        requestId: request.headers['x-request-id'] || 'unknown',
      }),
    };

    response.status(status).json(errorResponse);
  }

  private logError(exception: unknown, request: Request, status: number): void {
    const { method, url, headers, body, query } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = headers['x-forwarded-for'] || request.connection.remoteAddress;

    const logContext = {
      method,
      url,
      statusCode: status,
      userAgent,
      ip,
      query,
      body: this.sanitizeBody(body),
      userId: (request as any).user?.sub || 'anonymous',
    };

    if (status >= 500) {
      this.logger.error(
        `${method} ${url} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
        JSON.stringify(logContext, null, 2),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${method} ${url} - ${status}`,
        exception instanceof Error ? exception.message : String(exception),
        JSON.stringify(logContext, null, 2),
      );
    }
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    const sanitized = { ...body };

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private getErrorName(status: number): string {
    switch (status) {
      case 400:
        return 'Bad Request';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Not Found';
      case 409:
        return 'Conflict';
      case 422:
        return 'Unprocessable Entity';
      case 429:
        return 'Too Many Requests';
      case 500:
        return 'Internal Server Error';
      case 502:
        return 'Bad Gateway';
      case 503:
        return 'Service Unavailable';
      default:
        return 'Error';
    }
  }
}
