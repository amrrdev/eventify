import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiKey, ApiKeyDocument } from '../schemas/api-key.schema';
import { Model, ObjectId } from 'mongoose';
import { ApiKeyStatus } from '../types/api-key.types';

@Injectable()
export class ApiKeyRepository {
  constructor(@InjectModel(ApiKey.name) private readonly ApiKeyModel: Model<ApiKeyDocument>) {}

  // activateApiKey();

  updateApiKeyActivation(ownerId: string, key: string, isActive: boolean) {
    try {
      return this.ApiKeyModel.findOneAndUpdate({ ownerId, key }, { active: isActive });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  deleteApiKey(ownerId: string, key: string) {
    try {
      return this.ApiKeyModel.findOneAndDelete({ ownerId, key });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  updateApiKeyUsage(key: string, apiKeyUsageCount: number) {
    try {
      return this.ApiKeyModel.findOneAndUpdate({ key }, { usageCount: apiKeyUsageCount }).lean().exec();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findApiKey(data: { apiKey: string }) {
    try {
      const apiKey = this.ApiKeyModel.findOne({ key: data.apiKey }).lean().exec();

      return apiKey;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findUserApiKeys(data: { ownerId: string }) {
    try {
      return this.ApiKeyModel.find({ ownerId: data.ownerId }).lean().exec();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  //name: string;
  async createApiKey(data: { key: string; name: string; ownerId: string; usageLimit?: number }) {
    try {
      const apiKey = new this.ApiKeyModel(data);
      return apiKey.save();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
