import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from '../integrations/redis/redis.constants';
import * as Redis from 'ioredis';
import { ApiKeyStatus } from './types/api-key.types';

@Injectable()
export class ApiKeyUsageService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis.Redis) {}

  async initializeApiKeyUsage(apiKeyId: string, apiKeyStatus: ApiKeyStatus): Promise<void> {
    const key = this.getKeyName(apiKeyId);
    const exists = await this.redis.exists(key);

    if (!exists) {
      await this.redis.hset(key, {
        key: apiKeyStatus.key,
        usageCount: apiKeyStatus.usageCount,
        usageLimit: apiKeyStatus.usageLimit,
        active: apiKeyStatus.active,
      });
    }
  }

  async registerApiKey(apiKeyId: string, apiKeyStatus: ApiKeyStatus) {
    const key = this.getKeyName(apiKeyId);
    const apiKeyStatusCheck = await this.redis.hgetall(key);

    if (Object.keys(apiKeyStatusCheck).length > 0) {
      await this.redis.del(key);
    }

    return await this.redis.hset(key, apiKeyStatus);
  }

  async incrementUsage(apiKeyId: string): Promise<ApiKeyStatus & { limitExceeded: boolean }> {
    const key = this.getKeyName(apiKeyId);

    const pipeline = this.redis.pipeline();
    pipeline.hincrby(key, 'usageCount', 1);
    pipeline.hgetall(key);

    const results = await pipeline.exec();

    if (!results || results.length < 2) {
      throw new Error('Failed to increment usage');
    }

    const [incrResult, getResult] = results;

    if (incrResult[0] || getResult[0]) {
      throw new Error('Redis operation failed');
    }

    const currentUsage = getResult[1] as Record<string, string>;
    const usageCount = parseInt(currentUsage.usageCount, 10);
    const usageLimit = parseInt(currentUsage.usageLimit, 10);

    return {
      key: currentUsage.key,
      usageCount,
      usageLimit,
      active: currentUsage.active === '1',
      limitExceeded: usageCount > usageLimit,
    };
  }

  async incrementUsage1(apiKeyId: string): Promise<Omit<ApiKeyStatus, 'active'> & { limitExceeded: boolean }> {
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

  async getUsage(apiKeyId: string): Promise<(ApiKeyStatus & { limitExceeded: boolean }) | null> {
    const key = this.getKeyName(apiKeyId);
    const usage = await this.redis.hgetall(key);

    if (Object.keys(usage).length === 0) {
      return null;
    }

    const usageCount = parseInt(usage.usageCount, 10);
    const usageLimit = parseInt(usage.usageLimit, 10);

    return {
      key: usage.key,
      usageCount,
      usageLimit,
      active: usage.active === '1',
      limitExceeded: usageCount > usageLimit,
    };
  }

  async resetUsage(apiKeyId: string): Promise<void> {
    const key = this.getKeyName(apiKeyId);
    await this.redis.hset(key, 'usageCount', 0);
  }

  async deleteApiKeyUsage(apiKeyId: string): Promise<void> {
    const key = this.getKeyName(apiKeyId);
    await this.redis.del(key);
  }

  private getKeyName(apiKeyId: string) {
    return `api_key:${apiKeyId}`;
  }
}
