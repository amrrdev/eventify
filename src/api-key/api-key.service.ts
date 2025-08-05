import { BadRequestException, Injectable } from '@nestjs/common';
import { ApiKeyRepository } from './repository/api-key.repository';
import * as crypto from 'node:crypto';
import { ValidateApiKeyDto } from './dtos/validate-api-key.dto';
import { ApiKeyStatus } from './types/api-key.types';

@Injectable()
export class ApiKeyService {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async findUserApiKeys(ownerId: string) {
    return await this.apiKeyRepository.findUserApiKeys({ ownerId });
  }

  async updateApiKeyUsage(key: string, apiKeyUsageCount: number) {
    return await this.apiKeyRepository.updateApiKeyUsage(key, apiKeyUsageCount);
  }

  async validateApiKey(dto: ValidateApiKeyDto) {
    const apiKey = await this.apiKeyRepository.findApiKey(dto);

    if (!apiKey) {
      throw new BadRequestException('Invalid API key. Please provide a valid key.');
    }

    if (!apiKey.active) {
      throw new BadRequestException('This API key has been deactivated. Please request a new one.');
    }

    if (apiKey.usageCount >= apiKey.usageLimit) {
      throw new BadRequestException(
        'API key usage limit reached. Please upgrade your plan to continue using the service.',
      );
    }
    return apiKey;
  }

  async createApiKey(ownerId: string) {
    const apiKey = this.generateApiKey(ownerId);
    await this.apiKeyRepository.createApiKey({ key: apiKey, ownerId });
    return { apiKey };
  }

  private generateApiKey(ownerId: string): string {
    const randomBytes = crypto.randomBytes(24).toString('hex');
    const userHint = ownerId.slice(0, 4);
    return `evntfy_${userHint}_${randomBytes}`;
  }
}
