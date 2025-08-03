import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from '../integrations/redis/redis.constants';
import * as Redis from 'ioredis';

@Injectable()
export class ApiKeyUsageService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis.Redis) {}

  async registerApiKey(apiKeyId: string, apiKeyStatus: ApiKeyStatus) {
    const key = this.getKeyName(apiKeyId);
    await this.redis.hmset(key, apiKeyStatus);
  }

  async incrementUsage(
    apiKeyId: string,
  ): Promise<{ success: boolean; limitExceeded: boolean; usageCount: number; usageLimit: number }> {
    const key = this.getKeyName(apiKeyId);

    const apiKeyStatus = await this.redis.hgetall(key);

    if (!apiKeyStatus || Object.keys(apiKeyStatus).length === 0) {
      throw new Error(`API key ${apiKeyId} not found`);
    }

    const currentUsage = parseInt(apiKeyStatus.usageCount) || 0;
    const usageLimit = parseInt(apiKeyStatus.usageLimit) || 0;

    if (currentUsage >= usageLimit) {
      return {
        success: false,
        limitExceeded: true,
        usageCount: currentUsage,
        usageLimit: usageLimit,
      };
    }

    const newUsage = await this.redis.hincrby(key, 'usageCount', 1);

    return {
      success: true,
      limitExceeded: false,
      usageCount: newUsage,
      usageLimit: usageLimit,
    };
  }

  // Helper method to get current usage without incrementing
  async getUsage(apiKeyId: string): Promise<ApiKeyStatus | null> {
    const key = this.getKeyName(apiKeyId);
    const apiKeyStatus = await this.redis.hgetall(key);

    if (!apiKeyStatus || Object.keys(apiKeyStatus).length === 0) {
      return null;
    }

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

export interface ApiKeyStatus {
  usageCount: number;
  usageLimit: number;
  active: boolean;
}
