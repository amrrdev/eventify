import { Injectable } from '@nestjs/common';
import { HashingService } from './hashing.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BcryptService implements HashingService {
  async hash(data: string): Promise<string> {
    const salt = await bcrypt.genSalt(8);
    return bcrypt.hash(data, salt);
  }

  async compare(data: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(data, hashedPassword);
  }
}
