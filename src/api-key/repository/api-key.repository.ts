import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiKey, ApiKeyDocument } from '../schemas/api-key.schema';
import { Model } from 'mongoose';

@Injectable()
export class ApiKeyRepository {
  constructor(@InjectModel(ApiKey.name) private readonly ApiKeyModel: Model<ApiKeyDocument>) {}

  async findApiKey(data: { apiKey: string }) {
    try {
      return this.ApiKeyModel.findOne({ key: data.apiKey }).select('-_id active usageCount usageLimit').lean().exec();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findUserApiKeys(data: { ownerId: string }) {
    try {
      return this.ApiKeyModel.find({ ownerId: data.ownerId })
        .select('key active usageCount usageLimit -_id')
        .lean()
        .exec();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async createApiKey(data: { key: string; ownerId: string; usageLimit?: number }) {
    try {
      const apiKey = new this.ApiKeyModel(data);
      return apiKey.save();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
