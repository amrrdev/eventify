import { IsArray } from 'class-validator';

export class DeleteBatchEventsDto {
  @IsArray()
  ids: string[];
}
