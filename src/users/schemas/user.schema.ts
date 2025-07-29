import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, minlength: 3 })
  name: string;

  @Prop({
    unique: true,
    required: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({
    required: true,
    minlength: 6,
  })
  password: string;

  @Prop({
    default: false,
    index: true,
  })
  isEmailVerified: boolean;

  @Prop({
    enum: ['user', 'admin'],
    default: 'user',
    index: true,
  })
  role: string;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { email: 1 },
  {
    unique: true,
    background: true,
    name: 'idx_email_unique',
  },
);

UserSchema.index(
  { email: 1, isEmailVerified: 1 },
  {
    background: true,
    name: 'idx_email_verified',
  },
);

UserSchema.index(
  { role: 1 },
  {
    background: true,
    name: 'idx_role',
  },
);

UserSchema.index(
  { role: 1, isEmailVerified: 1 },
  {
    background: true,
    name: 'idx_role_verified',
  },
);
