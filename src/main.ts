import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import * as cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ErrorLoggingInterceptor } from './common/interceptors/error-logging.interceptor';
import { UnhandledExceptionService } from './common/services/unhandled-exception.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';

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
      url: '0.0.0.0:4000',
      channelOptions: {
        'grpc.max_send_message_length': 2 * 1024 * 1024 * 1024, // 2GB
        'grpc.max_receive_message_length': 2 * 1024 * 1024 * 1024, // 2GB
      },
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
    credentials: true, // CRITICAL: Allow cookies to be sent cross-origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
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

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Eventify API')
    .setDescription('Event management platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Write swagger.json file
  writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
  console.log('Swagger JSON file generated at ./swagger.json');

  // Setup Swagger UI at /docs
  SwaggerModule.setup('/api/v1/docs', app, document);

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
