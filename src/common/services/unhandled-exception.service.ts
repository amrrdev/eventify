import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UnhandledExceptionService {
  private readonly logger = new Logger(UnhandledExceptionService.name);

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
      this.logger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.stack : String(reason),
        promise: promise.toString(),
      });

      // In production, you might want to gracefully shutdown
      if (process.env.NODE_ENV === 'production') {
        this.gracefulShutdown('unhandledRejection');
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.logger.fatal('Uncaught Exception', {
        error: error.stack,
        name: error.name,
        message: error.message,
      });

      // Always exit on uncaught exceptions
      this.gracefulShutdown('uncaughtException');
    });

    // Handle SIGTERM (graceful shutdown)
    process.on('SIGTERM', () => {
      this.logger.log('SIGTERM received, shutting down gracefully');
      this.gracefulShutdown('SIGTERM');
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      this.logger.log('SIGINT received, shutting down gracefully');
      this.gracefulShutdown('SIGINT');
    });

    this.logger.log('Global error handlers registered');
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    this.logger.log(`Graceful shutdown initiated by ${signal}`);

    try {
      // Give the app 10 seconds to clean up
      setTimeout(() => {
        this.logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);

      // Perform cleanup here
      await this.cleanup();

      this.logger.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  }

  private async cleanup(): Promise<void> {
    // Add cleanup logic here:
    // - Close database connections
    // - Stop background jobs
    // - Clean up temporary files
    // - Send pending notifications

    this.logger.log('Cleanup completed');
  }
}
