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

  @Prop({ index: true })
  category: string;

  @Prop({ type: [String], index: true })
  tags: string[];

  @Prop({
    type: String,
    enum: ['SEVERITY_UNSPECIFIED', 'INFO', 'WARN', 'ERROR'],
    default: 'SEVERITY_UNSPECIFIED',
    index: true,
  })
  severity: string;

  @Prop({ index: true })
  timestamp: Date;
}

export type EventDocument = Event & Document;
export const EventSchema = SchemaFactory.createForClass(Event);
