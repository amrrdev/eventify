import { Module } from '@nestjs/common';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { UnhandledExceptionService } from './services/unhandled-exception.service';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';

@Module({
  providers: [GlobalExceptionFilter, UnhandledExceptionService, ErrorLoggingInterceptor],
  exports: [GlobalExceptionFilter, UnhandledExceptionService, ErrorLoggingInterceptor],
})
export class CommonModule {}
