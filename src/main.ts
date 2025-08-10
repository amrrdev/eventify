import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import * as cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ErrorLoggingInterceptor } from './common/interceptors/error-logging.interceptor';
import { UnhandledExceptionService } from './common/services/unhandled-exception.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Initialize global error handling
  app.get(UnhandledExceptionService);

  // Set up global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Set up global error logging interceptor
  app.useGlobalInterceptors(new ErrorLoggingInterceptor());

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'events',
      protoPath: join(process.cwd(), 'src/proto/events.proto'),
      url: '0.0.0.0:50051',
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        json: true,
      },
    },
  });

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api/v1');

  try {
    await app.startAllMicroservices();
    console.log('✅ gRPC microservice started successfully');
  } catch (error) {
    console.error('❌ Failed to start gRPC microservice:', error.message);
    console.log('⚠️  Continuing without gRPC service...');
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
