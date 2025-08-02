import { Schema as MongooseSchema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@MongooseSchema({ collection: 'api_keys', timestamps: true })
export class ApiKey extends Document {
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

  @Prop({ default: 100 })
  usageLimit: number;
}

export type ApiKeyDocument = ApiKey & Document;
export const ApikeySchema = SchemaFactory.createForClass(ApiKey);

// ApikeySchema.index(
//   {
//     key: 1,
//   },
//   {
//     unique: true,
//     background: true,
//   },
// );
