import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from '../integrations/redis/redis.constants';
import * as Redis from 'ioredis';
import { ApiKeyStatus } from './types/api-key.types';

@Injectable()
export class ApiKeyUsageService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis.Redis) {}

  async registerApiKey(apiKeyId: string, apiKeyStatus: ApiKeyStatus) {
    const key = this.getKeyName(apiKeyId);
    await this.redis.hmset(key, apiKeyStatus);
  }

  async incrementUsage(apiKeyId: string): Promise<Omit<ApiKeyStatus, 'active'> & { limitExceeded: boolean }> {
    const key = this.getKeyName(apiKeyId);

    const apiKeyStatus = await this.redis.hgetall(key);

    if (!apiKeyStatus || Object.keys(apiKeyStatus).length === 0) {
      throw new Error(`API key ${apiKeyId} not found`);
    }

    const currentUsage = parseInt(apiKeyStatus.usageCount) || 0;
    const usageLimit = parseInt(apiKeyStatus.usageLimit) || 0;

    if (currentUsage >= usageLimit) {
      return {
        key: apiKeyStatus.key,
        limitExceeded: true,
        usageCount: currentUsage,
        usageLimit: usageLimit,
      };
    }

    const newUsage = await this.redis.hincrby(key, 'usageCount', 1);

    return {
      key: apiKeyStatus.key,
      limitExceeded: false,
      usageCount: newUsage,
      usageLimit: usageLimit,
    };
  }

  async getUsage(apiKeyId: string): Promise<ApiKeyStatus> {
    const key = this.getKeyName(apiKeyId);
    const apiKeyStatus = await this.redis.hgetall(key);

    return {
      ...apiKeyStatus,
      usageCount: parseInt(apiKeyStatus.usageCount) || 0,
      usageLimit: parseInt(apiKeyStatus.usageLimit) || 0,
    } as ApiKeyStatus;
  }

  async resetUsage(apiKeyId: string): Promise<void> {
    const key = this.getKeyName(apiKeyId);
    await this.redis.hset(key, 'usageCount', 0);
  }

  private getKeyName(apiKeyId: string) {
    return `api_key:${apiKeyId}`;
  }
}
