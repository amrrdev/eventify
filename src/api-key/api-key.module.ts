import { Module } from '@nestjs/common';
import { ApiKeyConttroller } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRepository } from './repository/api-key.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKey, ApikeySchema } from './schemas/api-key.schema';
import { ApiKeyUsageService } from './api-key-usage.service';
import { RedisModule } from '../integrations/redis/redis.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: ApiKey.name, schema: ApikeySchema }]), RedisModule],
  controllers: [ApiKeyConttroller],
  providers: [ApiKeyService, ApiKeyRepository, ApiKeyUsageService],
  exports: [ApiKeyService, ApiKeyRepository, ApiKeyUsageService],
})
export class ApiKeyModule {}
