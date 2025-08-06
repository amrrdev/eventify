import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteEventDto {
  eventId: string;
}
