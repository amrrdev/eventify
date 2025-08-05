import { Document, Schema } from 'mongoose';
import { Schema as MongooseSchema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@MongooseSchema({ timestamps: true })
export class Event extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: mongoose.Types.ObjectId;

  @Prop({ required: true, index: true })
  eventName: string;

  @Prop({ type: Schema.Types.Mixed, required: true })
  payload: Schema.Types.Mixed;

  @Prop({ type: Schema.Types.Mixed })
  metadata: Schema.Types.Mixed;
}

export type EventDocument = Event & Document;
export const EventSchema = SchemaFactory.createForClass(Event);
