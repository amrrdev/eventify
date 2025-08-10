import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(`${method} ${url} - Success (${duration}ms)`);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();

        this.logger.error(`${method} ${url} - Error (${duration}ms)`, {
          error: error.message,
          stack: error.stack,
          statusCode: response.statusCode || 500,
          userId: request.user?.sub || 'anonymous',
          userAgent: request.headers['user-agent'],
          ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress,
        });

        return throwError(() => error);
      }),
    );
  }
}
