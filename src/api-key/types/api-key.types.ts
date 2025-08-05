import { ObjectId } from 'mongoose';
import mongoose from 'mongoose';

export type ApiKeyStatus = {
  key: string;
  ownerId: mongoose.Types.ObjectId | string;
  active: boolean;
  usageCount: number;
  usageLimit: number;
};
