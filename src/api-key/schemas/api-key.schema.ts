import { Schema as MongooseSchema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { ApiKeyStatus } from '../types/api-key.types';

@MongooseSchema({ collection: 'api_keys', timestamps: true })
export class ApiKey extends Document {
  @Prop()
  name: string;

  @Prop({
    index: true,
    unique: true,
    required: true,
  })
  key: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: mongoose.Types.ObjectId;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: 5000 })
  usageLimit: number;
}

export type ApiKeyDocument = ApiKey & Document;
export const ApikeySchema = SchemaFactory.createForClass(ApiKey);

// ApikeySchema.set('toJSON', {
//   transform: function (_doc, ret: ApiKey & { name: string; _id: string }) {
//     // Create a new object with the desired type
//     const transformed = {
//       key: ret.key,
//       ownerId: ret.ownerId.toString(), // Convert ObjectId to string
//       usageCount: ret.usageCount,
//       usageLimit: ret.usageLimit,
//       active: ret.active,
//       _id: ret._id as string,
//       name: ret.name,
//     };
//     return transformed;
//   },
// });
