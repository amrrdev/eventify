import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'users', // Explicit collection name
})
export class User extends Document {
  @Prop({ required: true, minlength: 3 })
  name: string;

  @Prop({
    unique: true,
    required: true,
    index: true, // Individual index on email
    lowercase: true, // Normalize email to lowercase
    trim: true, // Remove whitespace
  })
  email: string;

  @Prop({
    required: true,
    minlength: 6,
  })
  password: string;

  @Prop({
    default: false,
    index: true, // Index for filtering verified users
  })
  isEmailVerified: boolean;

  @Prop({
    enum: ['user', 'admin'],
    default: 'user',
    index: true, // Index for role-based queries
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

// 2. Compound index for authentication queries (email + verification status)
UserSchema.index(
  { email: 1, isEmailVerified: 1 },
  {
    background: true,
    name: 'idx_email_verified',
  },
);

// 3. Role-based queries index
UserSchema.index(
  { role: 1 },
  {
    background: true,
    name: 'idx_role',
  },
);

// 4. Compound index for admin queries (role + verification)
UserSchema.index(
  { role: 1, isEmailVerified: 1 },
  {
    background: true,
    name: 'idx_role_verified',
  },
);

// 5. Text search index for user search functionality (optional)
UserSchema.index(
  {
    name: 'text',
    email: 'text',
  },
  {
    background: true,
    name: 'idx_text_search',
  },
);

// 6. Sparse index for performance on optional fields
UserSchema.index(
  { isEmailVerified: 1 },
  {
    sparse: true,
    background: true,
    name: 'idx_email_verified_sparse',
  },
);

// ============ PRE-SAVE MIDDLEWARE FOR DATA CONSISTENCY ============
UserSchema.pre('save', function (next) {
  // Ensure email is always lowercase
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});
