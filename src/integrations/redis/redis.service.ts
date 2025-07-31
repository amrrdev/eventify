import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import * as Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis.Redis) {}

  async insert(userId: string, tokenId: string): Promise<'OK'> {
    return await this.redisClient.set(this.getKey(userId), tokenId);
  }

  async validate(userId: string, tokenId: string): Promise<boolean> {
    const storedToken = await this.redisClient.get(this.getKey(userId));
    return storedToken === tokenId;
  }

  async inValidate(userId: string) {
    return await this.redisClient.del(this.getKey(userId));
  }

  async setOtp(email: string, hashedOtp: string) {
    return await this.redisClient.setex(`otp:${email}`, 600, hashedOtp);
  }

  async getOtp(email: string) {
    return await this.redisClient.get(`otp:${email}`);
  }

  async invalidateOtp(email: string) {
    return await this.redisClient.del(`otp:${email}`);
  }

  private getKey(userId: string): string {
    return `user-${userId}`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redisClient.quit();
  }
}
