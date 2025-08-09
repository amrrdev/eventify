import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { REDIS_CLIENT } from '../integrations/redis/redis.constants';
import * as Redis from 'ioredis';
import { ApiKeyStatus } from './types/api-key.types';
import { INCREMENT_USAGE_SCRIPT } from './constants/lua-scripts.constant';

@Injectable()
export class ApiKeyUsageService implements OnModuleInit {
  private scriptSha: string;
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis.Redis) {}

  async onModuleInit() {
    this.scriptSha = (await this.redis.script('LOAD', INCREMENT_USAGE_SCRIPT)) as string;
  }

  async initializeApiKeyUsage(apiKeyId: string, apiKeyStatus: ApiKeyStatus): Promise<void> {
    const key = this.getKeyName(apiKeyId);
    const exists = await this.redis.exists(key);

    if (!exists) {
      await this.redis.hset(key, {
        key: apiKeyStatus.key,
        ownerId: apiKeyStatus.ownerId,
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

    const [apiKey, ownerId, usageCountStr, usageLimitStr, active] = (await this.redis.evalsha(
      this.scriptSha,
      1,
      key,
    )) as string[];

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // NOTE: This approach is **not atomic** and may lead to a **race condition**
    // if multiple workers switch context between the `HINCRBY` and `HGETALL` operations.
    // Since the pipeline does not guarantee atomicity across multiple commands,
    // another worker mght modify the hash between these two operations,
    // causing inaccurate or stale read    // const pipeline = this.redis.pipeline();
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    // // pipeline.hincrby(key, 'usageCount', 1);
    // // pipeline.hgetall(key);

    // const results = await pipeline.exec();

    // if (!results || results.length < 2) {
    //   throw new Error('Failed to increment usage');
    // }

    // const [incrResult, getResult] = results;

    // if (incrResult[0] || getResult[0]) {
    //   throw new Error('Redis operation failed');
    // }

    // const currentUsage = getResult[1] as Record<string, string>;
    const usageCount = parseInt(usageCountStr, 10);
    const usageLimit = parseInt(usageLimitStr, 10);

    return {
      key: apiKey,
      ownerId,
      usageCount,
      usageLimit,
      active: Boolean(active),
      limitExceeded: usageCount > usageLimit,
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
      ownerId: usage.ownerId,
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
