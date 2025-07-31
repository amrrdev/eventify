import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Model } from 'mongoose';
import { IUser } from '../interfaces/user.interface';
import { UserRole } from '../../common/enums/user-role.enum';

/**
 * TODO: create mongodb custom exception
 */

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findById(userId: string, options?: { includedPassword: boolean }) {
    try {
      const query = this.userModel.findById(userId).select('-__v');
      return options?.includedPassword ? query.select('+password').lean().exec() : query.lean().exec();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findByEmail(email: string, options?: { includedPassword: boolean }) {
    try {
      const query = this.userModel.findOne({ email }).select('-__v');
      return options?.includedPassword ? query.select('+password').lean().exec() : query.lean().exec();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async updateEmailVerificationStatus(email: string, isVerified: boolean) {
    try {
      await this.userModel.updateOne({ email }, { isEmailVerified: isVerified }).lean().exec();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async createUser(createUserDto: IUser, role: UserRole = UserRole.User) {
    try {
      const newUser = new this.userModel({ ...createUserDto, role });
      return newUser.save();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
