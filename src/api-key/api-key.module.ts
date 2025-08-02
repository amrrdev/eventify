import { Module } from '@nestjs/common';
import { ApiKeyConttroller } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRepository } from './repository/api-key.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKey, ApikeySchema } from './schemas/api-key.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: ApiKey.name, schema: ApikeySchema }])],
  controllers: [ApiKeyConttroller],
  providers: [ApiKeyService, ApiKeyRepository],
  exports: [ApiKeyRepository],
})
export class ApiKeyModule {}
