import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { REDIS_CLIENT } from '../integrations/redis/redis.constants';
import * as Redis from 'ioredis';
import { ApiKeyStatus } from './types/api-key.types';
import { INCREMENT_USAGE_SCRIPT } from './constants/lua-scripts.constant';
import { ApiKeyRepository } from './repository/api-key.repository';

@Injectable()
export class ApiKeyUsageService implements OnModuleInit {
  private scriptSha: string;
  private syncCounter = new Map<string, number>();
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis.Redis,
    private readonly apiKeyRepository: ApiKeyRepository,
  ) {}

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

    const usageCount = parseInt(usageCountStr, 10);
    const usageLimit = parseInt(usageLimitStr, 10);

    const currentCount = this.syncCounter.get(apiKeyId) || 0;
    this.syncCounter.set(apiKeyId, currentCount + 1);

    if ((currentCount + 1) % 1000 === 0) {
      this.apiKeyRepository.updateApiKeyUsage(apiKey, usageCount);
      this.syncCounter.set(apiKeyId, 0);
    }

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
